package main

import (
	"testing"
	"time"
)

func TestParseTodoCalendarLines(t *testing.T) {
	content := `- Clean the room @id=clean123 @due=2026-05-18T23:59:59+08:00 @desc="Clean kitchen and bedroom"
- Skip me @due=2026-05-18T23:59:59+08:00
- Read book @id=read456
- Play game @id=play789 @due=0001-01-01T00:00:00+08:00 # some comment here
= Another format @id=another_fmt @desc="Simple test"
`

	lines := parseTodoCalendarLines(content)

	// We expect 4 lines, because "Skip me" has no @id and should be skipped.
	if len(lines) != 4 {
		t.Fatalf("Expected 4 parsed lines, got %d", len(lines))
	}

	// Case 1: Clean the room
	c1 := lines[0]
	if c1.TodoID != "clean123" {
		t.Errorf("c1: Expected ID 'clean123', got %q", c1.TodoID)
	}
	if c1.Title != "Clean the room" {
		t.Errorf("c1: Expected Title 'Clean the room', got %q", c1.Title)
	}
	if c1.Description != "Clean kitchen and bedroom" {
		t.Errorf("c1: Expected Description 'Clean kitchen and bedroom', got %q", c1.Description)
	}
	if !c1.HasDue {
		t.Errorf("c1: Expected HasDue to be true")
	}
	expectedDue, _ := time.Parse(time.RFC3339, "2026-05-18T23:59:59+08:00")
	if !c1.Due.Equal(expectedDue) {
		t.Errorf("c1: Expected Due %v, got %v", expectedDue, c1.Due)
	}
	if c1.LineIndex != 0 {
		t.Errorf("c1: Expected LineIndex 0, got %d", c1.LineIndex)
	}

	// Case 2: Read book (no due, no description)
	c2 := lines[1]
	if c2.TodoID != "read456" {
		t.Errorf("c2: Expected ID 'read456', got %q", c2.TodoID)
	}
	if c2.Title != "Read book" {
		t.Errorf("c2: Expected Title 'Read book', got %q", c2.Title)
	}
	if c2.Description != "" {
		t.Errorf("c2: Expected empty Description, got %q", c2.Description)
	}
	if c2.HasDue {
		t.Errorf("c2: Expected HasDue to be false")
	}
	if c2.LineIndex != 2 { // Line Index is 2 because "Skip me" is at index 1
		t.Errorf("c2: Expected LineIndex 2, got %d", c2.LineIndex)
	}

	// Case 3: Play game (default/zero due date, comment trimming)
	c3 := lines[2]
	if c3.TodoID != "play789" {
		t.Errorf("c3: Expected ID 'play789', got %q", c3.TodoID)
	}
	if c3.Title != "Play game" { // "Play game # some comment here" with comment stripped
		t.Errorf("c3: Expected Title 'Play game', got %q", c3.Title)
	}
	if c3.HasDue {
		t.Errorf("c3: Expected HasDue to be false for default/zero due date")
	}
	if c3.LineIndex != 3 {
		t.Errorf("c3: Expected LineIndex 3, got %d", c3.LineIndex)
	}

	// Case 4: = Another format
	c4 := lines[3]
	if c4.TodoID != "another_fmt" {
		t.Errorf("c4: Expected ID 'another_fmt', got %q", c4.TodoID)
	}
	if c4.Title != "Another format" {
		t.Errorf("c4: Expected Title 'Another format', got %q", c4.Title)
	}
	if c4.Description != "Simple test" {
		t.Errorf("c4: Expected Description 'Simple test', got %q", c4.Description)
	}
	if c4.LineIndex != 4 {
		t.Errorf("c4: Expected LineIndex 4, got %d", c4.LineIndex)
	}
}
