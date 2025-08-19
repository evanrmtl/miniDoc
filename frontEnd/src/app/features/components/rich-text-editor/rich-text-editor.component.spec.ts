// rich-text-editor.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RichTextEditorComponent } from './rich-text-editor.component';
import { isValidIdPath } from './rich-text-editor.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RichTextEditorComponent', () => {
    let component: RichTextEditorComponent;
    let fixture: ComponentFixture<RichTextEditorComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RichTextEditorComponent],
            providers: [
            {
                provide: ActivatedRoute,
                useValue: {
                    snapshot: { paramMap: { get: (key: string) => 'some-uuid' } }
                },
            },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(RichTextEditorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
        expect(component.lseq).toBeDefined();
        expect(component.ropeTree).toBeDefined();
    });

    describe('Component Logic', () => {
      it('should insert character correctly', () => {
          const initialString = component.lseq.printString();
          
          component.insertCharAtPosition(0, 'A');
          
          expect(component.lseq.printString()).toContain('A');
          expect(component.lseq.atoms.length).toBeGreaterThan(0);
      });

      it('should handle multiple character insertions', () => {
          const chars = ['H', 'e', 'l', 'l', 'o'];
          
          chars.forEach((char, index) => {
              component.insertCharAtPosition(index, char);
          });
          
          expect(component.lseq.printString()).toBe('Hello');
      });

      it('should delete character correctly', () => {
          // Setup
          component.insertCharAtPosition(0, 'A');
          component.insertCharAtPosition(1, 'B');
          expect(component.lseq.printString()).toBe('AB');
          
          // Test deletion
          component.deleteCharAtPosition(0);
          expect(component.lseq.printString()).toBe('B');
      });

      it('should handle deletion of non-existent position gracefully', () => {
          expect(() => component.deleteCharAtPosition(999)).not.toThrow();
      });
  });

  describe('Event Handling with Mocks', () => {
    it('should handle key input for character insertion', () => {
        spyOn(component, 'getCaretPosition').and.returnValue(0);
        spyOn(component, 'insertCharAtPosition');
        
        const mockEvent = { key: 'a' };
        component.onInput(mockEvent);
        
        expect(component.insertCharAtPosition).toHaveBeenCalledWith(0, 'a');
    });

    it('should handle backspace key', () => {
        spyOn(component, 'getCaretPosition').and.returnValue(1);
        spyOn(component, 'deleteCharAtPosition');
        
        const mockEvent = new KeyboardEvent('keydown', { key: 'Backspace' });
        component.onKeyInput(mockEvent);
        
        expect(component.deleteCharAtPosition).toHaveBeenCalledWith(1);
    });

    it('should handle delete key', () => {
        spyOn(component, 'getCaretPosition').and.returnValue(1);
        spyOn(component, 'deleteCharAtPosition');
        
        const mockEvent = new KeyboardEvent('keydown', { key: 'Delete' });
        component.onKeyInput(mockEvent);
        
        expect(component.deleteCharAtPosition).toHaveBeenCalledWith(1);
    });
  });

  describe('DOM Integration', () => {
    let editorDiv: HTMLElement;

    beforeEach(() => {
        // Créer un élément DOM pour les tests
        editorDiv = document.createElement('div');
        editorDiv.className = 'rich-text-editor';
        editorDiv.contentEditable = 'true';
        document.body.appendChild(editorDiv);
        
        spyOn(component, 'getEditorDiv').and.returnValue(editorDiv);
    });

    afterEach(() => {
        document.body.removeChild(editorDiv);
    });

    it('should find editor div correctly', () => {
        const result = component.getEditorDiv();
        expect(result).toBe(editorDiv);
    });

    it('should handle simulated text input', () => {
        spyOn(component, 'getCaretPosition').and.returnValue(0);
        
        const event = new KeyboardEvent('keydown', { key: 'H' });
        component.onKeyInput(event);
        
        // Vérifier que l'état interne est cohérent
        expect(component.lseq).toBeDefined();
        expect(component.ropeTree).toBeDefined();
    });
  });

  describe('Utility Functions', () => {
    describe('isValidIdPath', () => {
      it('should return false for null or undefined', () => {
        expect(isValidIdPath(null)).toBe(false);
        expect(isValidIdPath(undefined)).toBe(false);
      });

      it('should return false for empty arrays', () => {
        expect(isValidIdPath([])).toBe(false);
      });

      it('should return true for valid finite number arrays', () => {
        expect(isValidIdPath([1, 2, 3])).toBe(true);
        expect(isValidIdPath([0])).toBe(true);
      });

      it('should return true for infinity values', () => {
        expect(isValidIdPath([-Infinity])).toBe(true);
        expect(isValidIdPath([Infinity])).toBe(true);
      });

      it('should return false for arrays with NaN', () => {
          expect(isValidIdPath([1, NaN, 3])).toBe(false);
      });

      it('should return false for non-arrays', () => {
        expect(isValidIdPath('not an array' as any)).toBe(false);
        expect(isValidIdPath(123 as any)).toBe(false);
      });
    });
  });

  describe('Complete Scenarios', () => {
    it('should handle complete typing scenario', () => {
        spyOn(component, 'getCaretPosition').and.callFake(() => {
            return component.lseq.printString().length; // Simuler curseur à la fin
        });

        // Simuler la saisie de "Hello"
        const word = "Hello";
        for (let i = 0; i < word.length; i++) {
            (component.getCaretPosition as jasmine.Spy).and.returnValue(i);
            component.insertCharAtPosition(i, word[i]);
        }
        expect(component.lseq.printString()).toBe("Hello");
    });

    it('should handle insertion in middle of text', () => {
        // Setup initial text
        ['H', 'e', 'l', 'o'].forEach((char, index) => {
            component.insertCharAtPosition(index, char);
        });
        expect(component.lseq.printString()).toBe("Helo");

        // Insert 'l' in the middle
        component.insertCharAtPosition(3, 'l');
        expect(component.lseq.printString()).toBe("Hello");
    });

    it('should handle mixed insert and delete operations', () => {
        "Hello".split('').forEach((char, index) => {
            component.insertCharAtPosition(index, char);
        });
        expect(component.lseq.printString()).toBe("Hello");

        component.deleteCharAtPosition(2); 
        expect(component.lseq.printString()).toBe("Helo");

        component.insertCharAtPosition(2, 'X');
        expect(component.lseq.printString()).toBe("HeXlo");
    });
  });

  describe('Caret Position Handling', () => {
    beforeEach(() => {
        const mockSelection = {
            rangeCount: 1,
            getRangeAt: jasmine.createSpy().and.returnValue({
                cloneRange: jasmine.createSpy().and.returnValue({
                    selectNodeContents: jasmine.createSpy(),
                    setEnd: jasmine.createSpy(),
                    toString: jasmine.createSpy().and.returnValue('test')
                })
            })
        };
        spyOn(window, 'getSelection').and.returnValue(mockSelection as any);
    });

    it('should get caret position when selection exists', () => {
        spyOn(component, 'getEditorDiv').and.returnValue(document.createElement('div'));
        
        const position = component.getCaretPosition();
        expect(position).toBeDefined();
        expect(typeof position).toBe('number');
    });

    it('should return 0 when no selection exists', () => {
        (window.getSelection as jasmine.Spy).and.returnValue(null);
        
        const position = component.getCaretPosition();
        expect(position).toBe(0);
    });
  });
});
