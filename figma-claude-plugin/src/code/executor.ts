import { executeClone, CloneAction } from './actions/clone';
import { executeModifyFills, executeModifyFillsByName, ModifyFillsAction } from './actions/modify-fills';
import { executeModifyText, executeModifyTextByName, ModifyTextAction } from './actions/modify-text';
import { executeModifyLayout, ModifyLayoutAction } from './actions/modify-layout';
import { executeSetVisibility, executeSetVisibilityByName, SetVisibilityAction } from './actions/set-visibility';
import { executeCreateFrame, CreateFrameAction } from './actions/create-frame';
import { executeCreateText, CreateTextAction } from './actions/create-text';
import { executeCreateRectangle, CreateRectangleAction } from './actions/create-rectangle';
import { executeCreateVariants, CreateVariantsAction } from './actions/create-variants';
import { executeCreateComponent, executeCreateInstance, CreateComponentAction, CreateInstanceAction } from './actions/create-component';
import { executeSetEffects, SetEffectsAction } from './actions/set-effects';
import { executeMoveNode, MoveNodeAction } from './actions/move-node';
import { executeDeleteNode, DeleteNodeAction } from './actions/delete-node';
import { executeWrapInFrame, WrapInFrameAction } from './actions/wrap-in-frame';
import { executeDuplicateNode, DuplicateNodeAction } from './actions/duplicate-node';
import { executeReorderChildren, ReorderChildrenAction } from './actions/reorder-children';
import { pushUndo } from './undo';

export type DesignAction =
  | CloneAction
  | ModifyFillsAction
  | ModifyTextAction
  | ModifyLayoutAction
  | SetVisibilityAction
  | FindAndModifyAction
  | CreateFrameAction
  | CreateTextAction
  | CreateRectangleAction
  | CreateVariantsAction
  | CreateComponentAction
  | CreateInstanceAction
  | SetEffectsAction
  | MoveNodeAction
  | DeleteNodeAction
  | WrapInFrameAction
  | DuplicateNodeAction
  | ReorderChildrenAction;

// Higher-level action: find child by name and modify
interface FindAndModifyAction {
  type: 'findAndModify';
  parentNodeId: string;
  targetName: string;
  modifications: {
    fills?: Array<{ type: string; color: string; opacity?: number }>;
    text?: { characters?: string; fontSize?: number; fillColor?: string; fontFamily?: string; fontStyle?: string };
    visible?: boolean;
    opacity?: number;
    layout?: {
      layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
      primaryAxisSizingMode?: 'FIXED' | 'AUTO';
      counterAxisSizingMode?: 'FIXED' | 'AUTO';
      primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
      counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX';
      layoutGrow?: number;
      layoutAlign?: 'STRETCH' | 'INHERIT';
      itemSpacing?: number;
      paddingLeft?: number;
      paddingRight?: number;
      paddingTop?: number;
      paddingBottom?: number;
      cornerRadius?: number;
      clipsContent?: boolean;
      layoutWrap?: 'NO_WRAP' | 'WRAP';
      width?: number;
      height?: number;
    };
    effects?: Array<{
      type: string;
      color?: string;
      opacity?: number;
      offsetX?: number;
      offsetY?: number;
      radius?: number;
      spread?: number;
    }>;
  };
}

export interface ActionResult {
  action: string;
  success: boolean;
  nodeId?: string;
  nodeIds?: string[];
  error?: string;
}

// Map to track created/cloned nodes by alias
var nodeAliasMap = new Map<string, string>();

function resolveNodeId(id: string): string {
  return nodeAliasMap.get(id) || id;
}

function registerNode(index: number, nodeId: string, name?: string) {
  nodeAliasMap.set('cloned_' + index, nodeId);
  nodeAliasMap.set('created_' + index, nodeId);
  if (name) {
    nodeAliasMap.set(name, nodeId);
  }
}

export async function executeActions(actions: DesignAction[]): Promise<ActionResult[]> {
  var results: ActionResult[] = [];
  nodeAliasMap.clear();

  for (var i = 0; i < actions.length; i++) {
    var action = actions[i];

    try {
      switch (action.type) {
        case 'clone': {
          var cloneResolved = Object.assign({}, action, { sourceNodeId: resolveNodeId(action.sourceNodeId) });
          var cloned = await executeClone(cloneResolved);
          if (cloned) {
            registerNode(i, cloned.id, action.newName);
            results.push({ action: 'clone', success: true, nodeId: cloned.id });
          } else {
            results.push({ action: 'clone', success: false, error: 'Clone failed' });
          }
          break;
        }

        case 'modifyFills': {
          var fillsResolved = Object.assign({}, action, { nodeId: resolveNodeId(action.nodeId) });
          var fillsOk = await executeModifyFills(fillsResolved);
          results.push({ action: 'modifyFills', success: fillsOk, nodeId: fillsResolved.nodeId });
          break;
        }

        case 'modifyText': {
          var textResolved = Object.assign({}, action, { nodeId: resolveNodeId(action.nodeId) });
          var textOk = await executeModifyText(textResolved);
          results.push({ action: 'modifyText', success: textOk, nodeId: textResolved.nodeId });
          break;
        }

        case 'modifyLayout': {
          var layoutResolved = Object.assign({}, action, { nodeId: resolveNodeId(action.nodeId) });
          var layoutOk = await executeModifyLayout(layoutResolved);
          results.push({ action: 'modifyLayout', success: layoutOk, nodeId: layoutResolved.nodeId });
          break;
        }

        case 'setVisibility': {
          var visResolved = Object.assign({}, action, { nodeId: resolveNodeId(action.nodeId) });
          var visOk = await executeSetVisibility(visResolved);
          results.push({ action: 'setVisibility', success: visOk, nodeId: visResolved.nodeId });
          break;
        }

        case 'findAndModify': {
          var fmParentId = resolveNodeId(action.parentNodeId);
          var fmOk = false;

          if (action.modifications.fills) {
            fmOk = (await executeModifyFillsByName(fmParentId, action.targetName, action.modifications.fills)) || fmOk;
          }
          if (action.modifications.text) {
            fmOk = (await executeModifyTextByName(fmParentId, action.targetName, action.modifications.text)) || fmOk;
          }
          if (action.modifications.visible !== undefined) {
            fmOk = (await executeSetVisibilityByName(fmParentId, action.targetName, action.modifications.visible)) || fmOk;
          }
          if (action.modifications.opacity !== undefined) {
            var fmParent = await figma.getNodeByIdAsync(fmParentId);
            if (fmParent && 'findAll' in fmParent) {
              var opTargets = (fmParent as FrameNode).findAll(function (n) {
                return n.name.toLowerCase().includes(action.targetName.toLowerCase());
              });
              for (var ot = 0; ot < opTargets.length; ot++) {
                if ('opacity' in opTargets[ot]) {
                  (opTargets[ot] as any).opacity = action.modifications.opacity;
                  fmOk = true;
                }
              }
            }
          }
          if (action.modifications.layout) {
            var layoutParent = await figma.getNodeByIdAsync(fmParentId);
            if (layoutParent && 'findAll' in layoutParent) {
              var layoutTargets = (layoutParent as FrameNode).findAll(function (n) {
                return n.name.toLowerCase().includes(action.targetName.toLowerCase());
              });
              for (var lt = 0; lt < layoutTargets.length; lt++) {
                if ('layoutMode' in layoutTargets[lt]) {
                  var lAction: ModifyLayoutAction = Object.assign(
                    { type: 'modifyLayout' as const, nodeId: layoutTargets[lt].id },
                    action.modifications.layout
                  );
                  fmOk = (await executeModifyLayout(lAction)) || fmOk;
                }
              }
            }
          }
          if (action.modifications.effects) {
            var effParent = await figma.getNodeByIdAsync(fmParentId);
            if (effParent && 'findAll' in effParent) {
              var effTargets = (effParent as FrameNode).findAll(function (n) {
                return n.name.toLowerCase().includes(action.targetName.toLowerCase());
              });
              for (var et = 0; et < effTargets.length; et++) {
                var effAction = { type: 'setEffects' as const, nodeId: effTargets[et].id, effects: action.modifications.effects };
                fmOk = (await executeSetEffects(effAction)) || fmOk;
              }
            }
          }

          results.push({ action: 'findAndModify', success: fmOk, nodeId: fmParentId });
          break;
        }

        case 'createFrame': {
          var cfResolved = action.parentNodeId
            ? Object.assign({}, action, { parentNodeId: resolveNodeId(action.parentNodeId) })
            : action;
          var frame = await executeCreateFrame(cfResolved);
          registerNode(i, frame.id, action.name);
          results.push({ action: 'createFrame', success: true, nodeId: frame.id });
          break;
        }

        case 'createText': {
          var ctResolved = action.parentNodeId
            ? Object.assign({}, action, { parentNodeId: resolveNodeId(action.parentNodeId) })
            : action;
          var text = await executeCreateText(ctResolved);
          registerNode(i, text.id, action.name);
          results.push({ action: 'createText', success: true, nodeId: text.id });
          break;
        }

        case 'createRectangle': {
          var crResolved = action.parentNodeId
            ? Object.assign({}, action, { parentNodeId: resolveNodeId(action.parentNodeId) })
            : action;
          var rect = await executeCreateRectangle(crResolved);
          registerNode(i, rect.id, action.name);
          results.push({ action: 'createRectangle', success: true, nodeId: rect.id });
          break;
        }

        case 'createVariants': {
          var cvResolved = Object.assign({}, action, { sourceNodeId: resolveNodeId(action.sourceNodeId) });
          var clones2 = await executeCreateVariants(cvResolved);
          var ids = clones2.map(function (c) { return c.id; });
          for (var vi = 0; vi < clones2.length; vi++) {
            nodeAliasMap.set('variant_' + vi, clones2[vi].id);
            nodeAliasMap.set(clones2[vi].name, clones2[vi].id);
          }
          results.push({
            action: 'createVariants',
            success: clones2.length > 0,
            nodeIds: ids,
          });
          break;
        }

        case 'createComponent': {
          var ccResolved = Object.assign({}, action, { sourceNodeId: resolveNodeId(action.sourceNodeId) });
          var comp = await executeCreateComponent(ccResolved);
          if (comp) {
            registerNode(i, comp.id, action.name);
            results.push({ action: 'createComponent', success: true, nodeId: comp.id });
          } else {
            results.push({ action: 'createComponent', success: false, error: 'Failed' });
          }
          break;
        }

        case 'createInstance': {
          var ciResolved = Object.assign({}, action, { componentNodeId: resolveNodeId(action.componentNodeId) });
          var inst = await executeCreateInstance(ciResolved);
          if (inst) {
            registerNode(i, inst.id, action.name);
            results.push({ action: 'createInstance', success: true, nodeId: inst.id });
          } else {
            results.push({ action: 'createInstance', success: false, error: 'Failed' });
          }
          break;
        }

        case 'setEffects': {
          var seResolved = Object.assign({}, action, { nodeId: resolveNodeId(action.nodeId) });
          var seOk = await executeSetEffects(seResolved);
          results.push({ action: 'setEffects', success: seOk, nodeId: seResolved.nodeId });
          break;
        }

        case 'moveNode': {
          var mnResolved = Object.assign({}, action, {
            nodeId: resolveNodeId(action.nodeId),
            newParentId: resolveNodeId(action.newParentId),
          });
          var mnOk = await executeMoveNode(mnResolved);
          results.push({ action: 'moveNode', success: mnOk, nodeId: mnResolved.nodeId });
          break;
        }

        case 'deleteNode': {
          var dnResolved = Object.assign({}, action, { nodeId: resolveNodeId(action.nodeId) });
          var dnOk = await executeDeleteNode(dnResolved);
          results.push({ action: 'deleteNode', success: dnOk, nodeId: dnResolved.nodeId });
          break;
        }

        case 'wrapInFrame': {
          var wfResolved = Object.assign({}, action, { parentNodeId: resolveNodeId(action.parentNodeId) });
          var wrapper = await executeWrapInFrame(wfResolved);
          if (wrapper) {
            registerNode(i, wrapper.id, action.frameName);
            results.push({ action: 'wrapInFrame', success: true, nodeId: wrapper.id });
          } else {
            results.push({ action: 'wrapInFrame', success: false, error: 'Failed' });
          }
          break;
        }

        case 'duplicateNode': {
          var dupResolved = Object.assign({}, action, { nodeId: resolveNodeId(action.nodeId) });
          var dupNode = await executeDuplicateNode(dupResolved);
          if (dupNode) {
            registerNode(i, dupNode.id, action.newName);
            results.push({ action: 'duplicateNode', success: true, nodeId: dupNode.id });
          } else {
            results.push({ action: 'duplicateNode', success: false, error: 'Failed' });
          }
          break;
        }

        case 'reorderChildren': {
          var rcResolved = Object.assign({}, action, { parentNodeId: resolveNodeId(action.parentNodeId) });
          var rcOk = await executeReorderChildren(rcResolved);
          results.push({ action: 'reorderChildren', success: rcOk, nodeId: rcResolved.parentNodeId });
          break;
        }

        default:
          results.push({
            action: (action as any).type,
            success: false,
            error: 'Unknown action type: ' + (action as any).type,
          });
      }
    } catch (err) {
      results.push({
        action: action.type,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Track created nodes for undo
  var createdIds: string[] = [];
  for (var r = 0; r < results.length; r++) {
    if (results[r].success && results[r].nodeId) {
      createdIds.push(results[r].nodeId!);
    }
    if (results[r].nodeIds) {
      for (var n = 0; n < results[r].nodeIds!.length; n++) {
        createdIds.push(results[r].nodeIds![n]);
      }
    }
  }
  if (createdIds.length > 0) {
    pushUndo(createdIds, actions.length + ' action(s)');
  }

  return results;
}
