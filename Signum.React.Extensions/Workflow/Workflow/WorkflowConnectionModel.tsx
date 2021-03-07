import * as React from 'react'
import { WorkflowConnectionModel, WorkflowConditionEntity, WorkflowActionEntity, WorkflowMessage, ConnectionType } from '../Signum.Entities.Workflow'
import { ValueLine, EntityLine, TypeContext, FormGroup, EntityTable } from '@framework/Lines'
import { useForceUpdate } from '@framework/Hooks';

export default function WorkflowConnectionModelComponent(p : { ctx: TypeContext<WorkflowConnectionModel> }){
  var ctx = p.ctx;
  const forceUpdate = useForceUpdate();

  function handleDecisionNameChange(e: React.SyntheticEvent<HTMLSelectElement>) {
    ctx.value.decisionOptionName = ctx.value.decisionOptions
      .find(d => d.element.name == (e.currentTarget as HTMLSelectElement).value)?.element.name ?? null;
    ctx.value.modified = true;
    forceUpdate();
  };

  return (
    <div>
      <ValueLine ctx={ctx.subCtx(e => e.name)} />
      <ValueLine ctx={ctx.subCtx(e => e.type)} onChange={() => { ctx.value.decisionOptionName = null; forceUpdate(); }} />

      {ctx.value.type == "Decision" &&
        < FormGroup ctx={ctx.subCtx(e => e.decisionOptionName)} labelText={ctx.niceName(e => e.decisionOptionName)}>
        {
          <select value={ctx.value.decisionOptionName ? ctx.value.decisionOptionName : ""} className="form-control" onChange={handleDecisionNameChange} >
            <option value="" />
            {(ctx.value.decisionOptions ?? []).map((d, i) => <option key={i} value={d.element.name} selected={d.element.name == ctx.value.decisionOptionName}>{d.element.name}</option>)}
            </select>
          }
        </FormGroup>}

      {ctx.value.needCondition ?
        ctx.value.mainEntityType ?
          <EntityLine ctx={ctx.subCtx(e => e.condition)} findOptions={{
            queryName: WorkflowConditionEntity,
            filterOptions: [
              { token: WorkflowConditionEntity.token().entity(e => e.mainEntityType), operation: "EqualTo", value: ctx.value.mainEntityType }
            ]
          }} /> : <div className="alert alert-warning">{WorkflowMessage.ToUse0YouSouldSetTheWorkflow1.niceToString(ctx.niceName(e => e.condition), ctx.niceName(e => e.mainEntityType))}</div>
        : undefined}

      {ctx.value.mainEntityType ?
        <EntityLine ctx={ctx.subCtx(e => e.action)} findOptions={{
          queryName: WorkflowActionEntity,
          filterOptions: [
            { token: WorkflowActionEntity.token().entity(e => e.mainEntityType), operation: "EqualTo", value: ctx.value.mainEntityType }
          ]
        }} />
        : <div className="alert alert-warning">{WorkflowMessage.ToUse0YouSouldSetTheWorkflow1.niceToString(ctx.niceName(e => e.action), ctx.niceName(e => e.mainEntityType))}</div>}

      {ctx.value.needOrder && <ValueLine ctx={ctx.subCtx(e => e.order)} />}
    </div>
  );
}
