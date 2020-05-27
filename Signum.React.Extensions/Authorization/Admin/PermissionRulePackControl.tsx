import * as React from 'react'
import { Button } from 'react-bootstrap'
import { notifySuccess } from '@framework/Operations'
import { TypeContext, ButtonsContext, IRenderButtons } from '@framework/TypeContext'
import { EntityLine, ValueLine } from '@framework/Lines'
import * as Finder from '@framework/Finder'

import { API } from '../AuthAdminClient'
import { PermissionRulePack, PermissionAllowedRule, AuthAdminMessage, PermissionSymbol, RoleEntity } from '../Signum.Entities.Authorization'
import { ColorRadio, GrayCheckbox } from './ColoredRadios'

import "./AuthAdmin.css"
import { GraphExplorer } from '@framework/Reflection'

export default React.forwardRef(function PermissionRulesPackControl(p: { ctx: TypeContext<PermissionRulePack> }, ref: React.Ref<IRenderButtons>) {

  function renderButtons(bc: ButtonsContext) {

    GraphExplorer.propagateAll(bc.pack.entity);

    const hasChanges = bc.pack.entity.modified;

    return [
      { button: <Button variant="primary" disabled={!hasChanges} onClick={() => handleSaveClick(bc)}>{AuthAdminMessage.Save.niceToString()}</Button> },
      { button: <Button variant="warning" disabled={!hasChanges} onClick={() => handleResetChangesClick(bc)}>{AuthAdminMessage.ResetChanges.niceToString()}</Button> },
      { button: <Button variant="info" disabled={hasChanges} onClick={() => handleSwitchToClick(bc)}>{AuthAdminMessage.SwitchTo.niceToString()}</Button> }
    ];
  }

  function handleSaveClick(bc: ButtonsContext) {
    let pack = p.ctx.value;

    API.savePermissionRulePack(pack)
      .then(() => API.fetchPermissionRulePack(pack.role.id!))
      .then(newPack => {
        notifySuccess();
        bc.frame.onReload({ entity: newPack, canExecute: {} });
      })
      .done();
  }

  function handleResetChangesClick(bc: ButtonsContext) {
    let pack = ctx.value;

    API.fetchPermissionRulePack(pack.role.id!)
      .then(newPack => { bc.frame.onReload({ entity: newPack, canExecute: {} }); })
      .done();
  }

  function handleSwitchToClick(bc: ButtonsContext) {

    Finder.find(RoleEntity).then(r => {
      if (!r)
        return;

      API.fetchPermissionRulePack(r.id!)
        .then(newPack => bc.frame.onReload({ entity: newPack, canExecute: {} }))
        .done();
    });
  }

  const [filter, setFilter] = React.useState("");

  React.useImperativeHandle(ref, () => ({ renderButtons }), [p.ctx.value])

  function updateFrame() {
    ctx.frame!.frameComponent.forceUpdate();
  }

  function handleSetFilter(e: React.FormEvent<any>) {
    setFilter((e.currentTarget as HTMLInputElement).value);
  }

  const parts = filter.match(/(!?\w+)/g);

  function isMatch(rule: PermissionAllowedRule): boolean {

    if (!parts || parts.length == 0)
      return true;

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];

      if (p.startsWith("!")) {
        if ("overriden".startsWith(p.after("!")) && rule.allowed != rule.allowedBase)
          return true;
      }

      if (rule.resource.key.toLowerCase().contains(p.toLowerCase()))
        return true;
    }

    return false;
  };

  let ctx = p.ctx;

  return (
    <div>
      <div className="form-compact">
        <EntityLine ctx={ctx.subCtx(f => f.role)} />
        <ValueLine ctx={ctx.subCtx(f => f.strategy)} />
      </div>
      <table className="table table-sm sf-auth-rules">
        <thead>
          <tr>
            <th>
              <div style={{ marginBottom: "-2px" }}>
                <input type="text" className="form-control form-control-sm" id="filter" placeholder="Permission-!overriden" value={filter} onChange={handleSetFilter} />
              </div>
            </th>
            <th style={{ textAlign: "center" }}>
              {AuthAdminMessage.Allow.niceToString()}
            </th>
            <th style={{ textAlign: "center" }}>
              {AuthAdminMessage.Deny.niceToString()}
            </th>
            <th style={{ textAlign: "center" }}>
              {AuthAdminMessage.Overriden.niceToString()}
            </th>
          </tr>
        </thead>
        <tbody>
          {ctx.mlistItemCtxs(a => a.rules)
            .filter(a => isMatch(a.value))
            .orderBy(a => a.value.resource.key).map((c, i) =>
            <tr key={i}>
              <td>
                {c.value.resource.key}
              </td>
              <td style={{ textAlign: "center" }}>
                {renderRadio(c.value, true, "green")}
              </td>
              <td style={{ textAlign: "center" }}>
                {renderRadio(c.value, false, "red")}
              </td>
              <td style={{ textAlign: "center" }}>
                <GrayCheckbox checked={c.value.allowed != c.value.allowedBase} onUnchecked={() => {
                  c.value.allowed = c.value.allowedBase;
                  ctx.value.modified = true;
                  updateFrame();
                }} />
              </td>
            </tr>
          )}
        </tbody>
      </table>

    </div>
  );

  function renderRadio(c: PermissionAllowedRule, allowed: boolean, color: string) {
    return <ColorRadio checked={c.allowed == allowed} color={color} onClicked={a => { c.allowed = allowed; c.modified = true; updateFrame() }} />;
  }
});
