import { Component, createEnvironmentInjector, OnInit } from '@angular/core';
import { RopeTree } from '../RopeTree/RopeTree';
import { LSEQ } from '../CRDT/LSEQ';
import { LseqIdentifier } from '../CRDT/LseqIdentifier';
import { LseqAtom } from '../CRDT/LseqAtom';

@Component({
  selector: 'app-rich-text-editor',
  imports: [],
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

  insertCharAtPosition(position : number, char: string){
    if (this.ropeTree.root) {
      
      const {p, q} = this.ropeTree.getInsertIds(this.ropeTree.root, position);
      const safeP = isValidIdPath(p?.path) ? p!.path : null;
      const safeQ = isValidIdPath(q?.path) ? q!.path : null;
      const id = this.lseq.alloc(safeP, safeQ);
      this.lseq.insert(id, char);
      console.log(`Inserting char "${char}" at position ${position} with id:`, id);
      console.log(this.ropeTree.printTree());
      this.ropeTree.insert( id, position);
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

function isValidIdPath(arr: number[] | undefined | null): arr is number[] {
  return Array.isArray(arr) && arr.length > 0 && arr.every(Number.isFinite);
}
