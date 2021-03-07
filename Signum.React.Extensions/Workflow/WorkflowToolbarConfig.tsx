import * as React from 'react'
import { Location } from 'history'
import { ToolbarConfig, ToolbarResponse } from '../Toolbar/ToolbarClient'
import * as WorkflowClient from './WorkflowClient'
import { WorkflowEntity } from './Signum.Entities.Workflow'
import { coalesceIcon } from '@framework/Operations/ContextualOperations';
import * as AppContext from '@framework/AppContext'
import { parseIcon } from '../Basics/Templates/IconTypeahead'

export default class WorkflowToolbarConfig extends ToolbarConfig<WorkflowEntity> {

  constructor() {
    var type = WorkflowEntity;
    super(type);
  }

  getIcon(element: ToolbarResponse<WorkflowEntity>) {
    return ToolbarConfig.coloredIcon(coalesceIcon(parseIcon(element.iconName), "th-large"), element.iconColor ?? "darkslateblue");
  }

  navigateTo(element: ToolbarResponse<WorkflowEntity>): Promise<string> {
    return Promise.resolve(WorkflowClient.workflowStartUrl(element.content!));
  }

  isCompatibleWithUrl(res: ToolbarResponse<WorkflowEntity>, location: Location, query: any): boolean {
    return location.pathname == AppContext.toAbsoluteUrl(WorkflowClient.workflowStartUrl(res.content!));
  }
}
