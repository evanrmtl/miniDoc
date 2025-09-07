import { AfterViewInit, Component, Renderer2, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { RopeTree } from '../../../core/services/collaboration/RopeTree/RopeTree.service';
import { LSEQ } from '../../../core/services/collaboration/CRDT/LSEQ.service';
import { ActivatedRoute } from '@angular/router';
import { WebSocketState } from '../../../core/state/websocketState.service';
import { WebSocketService } from '../../../core/services/websocket/websocket.service';
import { NavigateService } from '../../../core/navigation/navigation.service';
import { WebSocketErrorHandler } from '../../../core/services/websocket/errorHandler/webSocketHandler.service';

@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.scss',
})
export class RichTextEditorComponent implements OnInit, AfterViewInit {
  @ViewChild('editor') editor!: ElementRef<HTMLElement>;
  public lseq: LSEQ = inject(LSEQ);
  public ropeTree: RopeTree= inject(RopeTree);

  readonly websocketState: WebSocketState = inject(WebSocketState);
  readonly websocketService: WebSocketService = inject(WebSocketService);
  readonly websocketErrorHandler: WebSocketErrorHandler = inject(WebSocketErrorHandler)
  readonly navigator: NavigateService = inject(NavigateService);
  private file_uuid: string | null;

  constructor(private route: ActivatedRoute, private renderer: Renderer2) {
    this.file_uuid = this.route.snapshot.paramMap.get('uuid');
  }

  ngOnInit(): void {
    this.websocketService.sendMessage('joinFile', this.file_uuid);
    //TODO fetch fileContent
  }

  ngOnDestroy(): void {
    this.websocketService.sendMessage('exitFile', this.file_uuid);
  }

  ngAfterViewInit() {
    this.renderer.listen(this.editor.nativeElement, 'beforeinput', (event: InputEvent) => {
      if (!this.websocketState.isOpen()) {
        event.preventDefault();
        this.websocketErrorHandler.handleWebSocketError("error connection, please try again")
      }
    });
  }

  insertCharAtPosition(position: number, char: string) {

    const adjustedPosition = position + 1;

    if (this.ropeTree.root) {
      const { p, q } = this.ropeTree.getInsertIds(
        this.ropeTree.root,
        adjustedPosition
      );
      const safeP = isValidIdPath(p?.path) ? p!.path : null;
      const safeQ = isValidIdPath(q?.path) ? q!.path : null;
      const id = this.lseq.alloc(safeP, safeQ);
      this.lseq.insert(id, char);
      this.ropeTree.root = this.ropeTree.insert(this.ropeTree.root, id);
      console.log("path: ", id)
      this.websocketService.sendMessage(
        'crdt_op',
        JSON.stringify({
          operation: 'insert',
          char_value: char,
          path: id.path,
          sessionUUID: id.clientId,
          fileUUID: this.file_uuid,
        })
      );
    }
  }

  deleteCharAtPosition(position: number) {
    const adjustedPosition = position + 1;
    if (this.ropeTree.root === null) throw new Error('RopeTree root is null');
    const idToDelete = this.ropeTree.getDeleteIds(
      this.ropeTree.root,
      adjustedPosition
    );
    if (idToDelete) {
      this.lseq.delete(idToDelete);
      this.ropeTree.delete(idToDelete);
    }
  }

  onKeyInput($event: KeyboardEvent) {
    if (!this.websocketState.isOpen()) {
      return
    }
    const key = $event.key;
    if (key === 'Backspace' || key === 'Delete') {
      this.deleteCharAtPosition(this.getCaretPosition());
    }
  }

  onInput($event: any) {
    if (!this.websocketState.isOpen()) {
      return
    }    
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

export function isValidIdPath(
  arr: number[] | undefined | null
): arr is number[] {
  if (!Array.isArray(arr) || arr.length === 0) return false;

  if (arr[0] === -Infinity || arr[0] === Infinity) return true;

  return arr.every(Number.isFinite);
}
