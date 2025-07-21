import { Component, createEnvironmentInjector, OnInit } from '@angular/core';
import { RopeTree } from '../RopeTree/RopeTree';
import { LSEQ } from '../CRDT/LSEQ';
import { LseqIdentifier } from '../CRDT/LseqIdentifier';
import { LseqAtom } from '../CRDT/LseqAtom';
import { LeafNode } from '../RopeTree/LeafNode';

@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.scss',
})
export class RichTextEditorComponent implements OnInit {
  public lseq : LSEQ;
  public ropeTree : RopeTree;

  constructor(){
    this.lseq = new LSEQ();
    this.ropeTree = new RopeTree();
  }

  ngOnInit(): void {
    // Initialize the rich text editor
  }

  insertCharAtPosition(position: number, char: string) {
    const adjustedPosition = position + 1;
    
    if (this.ropeTree.root) {
      const {p, q} = this.ropeTree.getInsertIds(this.ropeTree.root, adjustedPosition);
      const safeP = isValidIdPath(p?.path) ? p!.path : null;
      const safeQ = isValidIdPath(q?.path) ? q!.path : null;
      const id = this.lseq.alloc(safeP, safeQ);
      this.lseq.insert(id, char);
      this.ropeTree.insert(id, adjustedPosition);
      console.log(this.lseq.printString()); // For debugging, prints the current string representation of LSEQ
      console.log(this.ropeTree.printTree(this.ropeTree.root)); // For debugging, prints the current tree structure
    }
  }


  deleteCharAtPosition(position: number) {
    const adjustedPosition = position + 1;
    if(this.ropeTree.root === null) throw new Error("RopeTree root is null");
    const idToDelete = this.ropeTree.getDeleteIds(this.ropeTree.root, adjustedPosition);
    if (idToDelete) {
      this.lseq.delete(idToDelete);
      this.ropeTree.delete(idToDelete, adjustedPosition);
      console.log(this.lseq.printString()); // For debugging, prints the current string representation of LSEQ
      console.log(this.ropeTree.printTree(this.ropeTree.root)); // For debugging, prints the current tree structure
    }
  }



  onKeyInput($event : KeyboardEvent) {
    const key = $event.key;
    if (key === 'Backspace' || key === 'Delete') {
      this.deleteCharAtPosition(this.getCaretPosition());
    }
  }

  onInput($event : any) {
    const position = this.getCaretPosition();
    const char = $event.key;
    this.insertCharAtPosition(position, char);
  }

  getCaretPosition(): number {
    let selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;

    let range = selection.getRangeAt(0);
    let preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.getEditorDiv());
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString().length;
  }

  getEditorDiv(): HTMLElement {
    return document.querySelector('.rich-text-editor') as HTMLElement;
  }
}

export function isValidIdPath(arr: number[] | undefined | null): arr is number[] {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    
    if (arr[0] === -Infinity || arr[0] === Infinity) return true;
    
    return arr.every(Number.isFinite);
  }

