import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

type MermaidModule = typeof import('mermaid').default
let mermaidInstance: MermaidModule | null = null
let mermaidTheme = 'default'

async function getMermaid() {
    if (!mermaidInstance) {
        const module = await import('mermaid')
        mermaidInstance = module.default
    }
    mermaidInstance.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: mermaidTheme,
        flowchart: {
            useMaxWidth: false,
            htmlLabels: false,
        }
    })
    return mermaidInstance
}

// Helper to update theme based on color mode
export function updateMermaidTheme(isDark: boolean) {
    mermaidTheme = isDark ? 'dark' : 'default'
    if (mermaidInstance) {
        mermaidInstance.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: mermaidTheme,
            flowchart: { useMaxWidth: false, htmlLabels: false },
        })
    }
}

/**
 * Math extension for marked to handle KaTeX formulas
 */
const mathExtension: any = {
    name: 'math',
    level: 'inline',
    start(src: string) { return src.indexOf('$'); },
    tokenizer(src: string, tokens: any) {
        const blockRule = /^\$\$([\s\S]+?)\$\$/;
        const inlineRule = /^\$((?:\\\$|[^$])+?)\$/;
        
        let match;
        if (match = blockRule.exec(src)) {
            return {
                type: 'math',
                raw: match[0],
                text: match[1].trim(),
                displayMode: true
            };
        } else if (match = inlineRule.exec(src)) {
            return {
                type: 'math',
                raw: match[0],
                text: match[1].trim(),
                displayMode: false
            };
        }
    },
    renderer(token: any) {
        try {
            return katex.renderToString(token.text, {
                displayMode: token.displayMode,
                throwOnError: false
            });
        } catch (e) {
            console.error('KaTeX render error:', e);
            return token.raw;
        }
    }
};

/**
 * Custom bold extension to be more lenient (allow spaces around content)
 * This helps when users write ** bold ** instead of **bold**
 */
const boldExtension: any = {
    name: 'strongLenient',
    level: 'inline',
    start(src: string) { return src.indexOf('**'); },
    tokenizer(src: string) {
        // Matches **text** or ** text **
        const rule = /^\*\*\s*([\s\S]+?)\s*\*\*/;
        const match = rule.exec(src);
        if (match) {
            return {
                type: 'strong',
                raw: match[0],
                text: match[1],
                tokens: this.lexer.inlineTokens(match[1])
            };
        }
    }
};

/**
 * Configure marked with extensions and options
 */
marked.use({
    extensions: [mathExtension, boldExtension],
    renderer: {
        code(token: any) {
            const { text, lang } = token;
            if (lang === 'mermaid') {
                // Store raw code in a custom attribute to ensure marked.js or Vue doesn't mangle it
                const encodedCode = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                return `<pre class="mermaid" data-mermaid-code="${encodedCode}"></pre>`;
            }
            // Fallback to default code rendering (which might be handled by marked internally if we don't return anything)
            return false; 
        }
    }
});

marked.setOptions({
    breaks: true,
    gfm: true
});

/**
 * Parse markdown to HTML
 * @param content markdown content
 * @returns html string
 */
export function parseMarkdown(content: string): string {
    return marked.parse(content || '') as string;
}

/**
 * Trigger mermaid rendering for elements with class "mermaid"
 */
export async function renderMermaid() {
    const nodes = document.querySelectorAll('.mermaid:not([data-processed="true"])');
    if (nodes.length === 0) return;
    const mermaid = await getMermaid()
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i] as HTMLElement;
        node.setAttribute('data-processed', 'true');
        
        // Retrieve the exact raw code we stashed in the attribute
        const rawCodeAttr = node.getAttribute('data-mermaid-code');
        if (!rawCodeAttr) continue;
        
        // Decode the entities back to raw text
        const txt = document.createElement("textarea");
        txt.innerHTML = rawCodeAttr;
        const code = txt.value;
        
        const id = `mermaid-render-${Date.now()}-${i}`;
        
        try {
            // Render the SVG string directly
            const { svg } = await mermaid.render(id, code);
            node.innerHTML = svg;
        } catch (e: any) {
            console.error('Mermaid render error:', e);
            const errorMsg = e?.message || e?.str || String(e);
            node.innerHTML = `
                <div style="color: #b91c1c; border: 1px solid #f87171; padding: 12px; background: #fef2f2; border-radius: 6px; font-size: 13px; font-family: monospace; white-space: pre-wrap; overflow-x: auto; text-align: left;">
                    <strong>Mermaid 解析错误:</strong><br/><br/>${errorMsg}
                </div>
            `;
        }
    }
}
