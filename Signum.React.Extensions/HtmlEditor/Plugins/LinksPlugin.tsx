import * as React from 'react';
import * as draftjs from 'draft-js';
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { IContentStateConverter, HtmlEditorController, HtmlEditorPlugin } from "../HtmlEditor"
import { HtmlEditorButton } from '../HtmlEditorButtons';

export default class LinksPlugin implements HtmlEditorPlugin {

  setLink(controller: HtmlEditorController) {
    const editorState = controller.editorState;
    const selection = editorState.getSelection();
    const contentState = editorState.getCurrentContent();
    const block = contentState.getBlockForKey(selection.getStartKey());
    const entityKey = block.getEntityAt(selection.getStartOffset());
    const entity = entityKey ? contentState.getEntity(entityKey) : null;

    const link = window.prompt('Paste the link -', entity?.getData().url);
    let newSelection = selection;
    if (newSelection.isCollapsed()) {
      if (entity != null) {
        block.findEntityRanges(
          meta => meta.getEntity() == entityKey,
          (start, end) => newSelection = newSelection.merge({ anchorOffset: start, focusOffset: end }) as draftjs.SelectionState)
      }
    }

    if (!link) {
      controller.setEditorState(draftjs.RichUtils.toggleLink(editorState, newSelection, null));
      return 'handled';
    }
    const content = editorState.getCurrentContent();
    const contentWithEntity = content.createEntity('LINK', 'MUTABLE', { url: link });
    const newEditorState = draftjs.EditorState.push(editorState, contentWithEntity, "apply-entity");
    const newEntityKey = contentWithEntity.getLastCreatedEntityKey();
    controller.setEditorState(draftjs.RichUtils.toggleLink(newEditorState, newSelection, newEntityKey))
  }

  getDecorators(controller: HtmlEditorController): [draftjs.DraftDecorator] {
    return [{
      component: DraftLink,
      strategy: (contentBlock, callback, contentState) => {
        contentBlock.findEntityRanges(
          (character) => {
            const entityKey = character.getEntity();
            return (entityKey !== null && contentState.getEntity(entityKey).getType() === 'LINK');
          },
          callback
        );
      }
    }]
  }

  getToolbarButtons(controller: HtmlEditorController) {
    return <LinkButton controller={controller} setLink={() => this.setLink(controller)} icon="link" />;
  }

  expandEditorProps(props: draftjs.EditorProps, controller: HtmlEditorController) {
    var prevKeyCommand = props.handleKeyCommand;
    props.handleKeyCommand = (command, state, timeStamp) => {

      if (prevKeyCommand) {
        var result = prevKeyCommand(command, state, timeStamp);
        if (result == "handled")
          return result;
      }

      if (command !== 'add-link') {
        return 'not-handled';
      }

      this.setLink(controller);
      return 'handled';
    }

    var prevKeyBindingFn = props.keyBindingFn;
    props.keyBindingFn = (event) => {
      if (prevKeyBindingFn) {
        var result = prevKeyBindingFn(event);
        if (result)
          return result;
      }

      const editorState = controller.editorState;
      const selection = editorState.getSelection();
      if (selection.isCollapsed()) {
        return null;
      }
      if (draftjs.KeyBindingUtil.hasCommandModifier(event) && event.which === 75 /*k*/) {
        return 'add-link' as draftjs.DraftEditorCommand;
      }

      return null;
    }
  }
}



export function DraftLink({ contentState, entityKey, children }: { contentState: draftjs.ContentState, entityKey: string, children: React.ReactChildren }) {
  const { url } = contentState.getEntity(entityKey).getData();
  return (
    <a
      className="link"
      href={url}
      title="Press [Ctrl] + click to follow the link"
      rel="noopener noreferrer"
      target="_blank"
      onClick={e => { if (e.ctrlKey) { e.preventDefault(); window.open(url); } }}
      aria-label={url}
    >
      {children}
    </a>
  );
}


function isLinkActive(editorState: draftjs.EditorState) {
  var selection = editorState.getSelection();
  var contentState = editorState.getCurrentContent();
  var block = contentState.getBlockForKey(selection.getStartKey());
  var entityKey = block.getEntityAt(selection.getStartOffset());
  if (!entityKey)
    return false;

  const entity = contentState.getEntity(entityKey)
  return entity.getType() == "LINK";
}

export function LinkButton(p: { controller: HtmlEditorController, icon?: IconProp, content?: React.ReactChild, title?: string, setLink: () => void }) {

  const isActive = isLinkActive(p.controller.editorState);

  function handleOnClick(e: React.MouseEvent) {
    e.preventDefault();
    p.setLink();
  }

  return <HtmlEditorButton isActive={isActive} onClick={handleOnClick} icon={p.icon} content={p.content} title={p.title} />
}
