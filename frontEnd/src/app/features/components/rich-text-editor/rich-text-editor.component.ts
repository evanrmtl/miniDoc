import { Component, OnInit } from '@angular/core';
import { RopeTree } from '../../../core/services/collaboration/RopeTree/RopeTree.service';
import { LSEQ } from '../../../core/services/collaboration/CRDT/LSEQ.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.scss',
})
export class RichTextEditorComponent implements OnInit {
  public lseq : LSEQ;
  public ropeTree : RopeTree;

  constructor(private route: ActivatedRoute){
    this.lseq = new LSEQ();
    this.ropeTree = new RopeTree();
  }

  ngOnInit(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    console.log(uuid);
  }

  insertCharAtPosition(position: number, char: string) {
    const adjustedPosition = position + 1;
    
    if (this.ropeTree.root) {
      const {p, q} = this.ropeTree.getInsertIds(this.ropeTree.root, adjustedPosition);
      const safeP = isValidIdPath(p?.path) ? p!.path : null;
      const safeQ = isValidIdPath(q?.path) ? q!.path : null;
      const id = this.lseq.alloc(safeP, safeQ);
      this.lseq.insert(id, char);
      this.ropeTree.root = this.ropeTree.insert(this.ropeTree.root, id);
    }
  }


  deleteCharAtPosition(position: number) {
    const adjustedPosition = position + 1;
    if(this.ropeTree.root === null) throw new Error("RopeTree root is null");
    const idToDelete = this.ropeTree.getDeleteIds(this.ropeTree.root, adjustedPosition);
    if (idToDelete) {
      this.lseq.delete(idToDelete);
      this.ropeTree.delete(idToDelete);
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

