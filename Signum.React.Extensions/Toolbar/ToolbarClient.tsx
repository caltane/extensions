import * as React from 'react'
import { Location } from 'history'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconProp } from '@fortawesome/fontawesome-svg-core'
import { ajaxGet } from '@framework/Services';
import { EntitySettings } from '@framework/Navigator'
import * as AppContext from '@framework/AppContext'
import * as Navigator from '@framework/Navigator'
import * as Finder from '@framework/Finder'
import { Lite, Entity } from '@framework/Signum.Entities'
import { Type } from '@framework/Reflection'
import { ToolbarEntity, ToolbarMenuEntity, ToolbarElementEmbedded, ToolbarElementType, ToolbarLocation } from './Signum.Entities.Toolbar'
import * as Constructor from '@framework/Constructor'
import * as UserAssetClient from '../UserAssets/UserAssetClient'
import { parseIcon } from '../Dashboard/Admin/Dashboard';
import { ValueSearchControl } from '@framework/Search';

export function start(options: { routes: JSX.Element[] }, ...configs: ToolbarConfig<any>[]) {
  Navigator.addSettings(new EntitySettings(ToolbarEntity, t => import('./Templates/Toolbar')));
  Navigator.addSettings(new EntitySettings(ToolbarMenuEntity, t => import('./Templates/ToolbarMenu')));
  Navigator.addSettings(new EntitySettings(ToolbarElementEmbedded, t => import('./Templates/ToolbarElement')));

  Finder.addSettings({ queryName: ToolbarEntity, defaultOrderColumn: ToolbarEntity.token(a => a.priority), defaultOrderType: "Descending" });

  Constructor.registerConstructor(ToolbarElementEmbedded, tn => ToolbarElementEmbedded.New({ type: "Item" }));

  configs.forEach(c => registerConfig(c));

  UserAssetClient.start({ routes: options.routes });
  UserAssetClient.registerExportAssertLink(ToolbarEntity);
}

export abstract class ToolbarConfig<T extends Entity> {
  type: Type<T>;
  constructor(type: Type<T>) {
    this.type = type;
  }

  getIcon(element: ToolbarResponse<T>) {
    return ToolbarConfig.coloredIcon(parseIcon(element.iconName), element.iconColor);
  }

  static coloredIcon(icon: IconProp | undefined, color: string | undefined): React.ReactChild | null {
    if (!icon)
      return null;

    return <FontAwesomeIcon icon={icon} className={"icon"} color={color} />;
  }

  getLabel(element: ToolbarResponse<T>) {
    return element.label ?? element.content!.toStr;
  }

  abstract navigateTo(element: ToolbarResponse<T>): Promise<string>;
  abstract isCompatibleWithUrl(element: ToolbarResponse<T>, location: Location, query: any): boolean;

  handleNavigateClick(e: React.MouseEvent<any>, res: ToolbarResponse<any>) {
    e.preventDefault();
    e.persist();
    this.navigateTo(res).then(url => {
      AppContext.pushOrOpenInTab(url, e);
    }).done();
  }
}


export const configs: { [type: string]: ToolbarConfig<any> } = {};

export function registerConfig<T extends Entity>(config: ToolbarConfig<T>) {
  configs[config.type.typeName] = config;
}

export namespace API {
  export function getCurrentToolbar(location: ToolbarLocation): Promise<ToolbarResponse<any> | null> {
    return ajaxGet({ url: `~/api/toolbar/current/${location}` });
  }
}

export interface ToolbarResponse<T extends Entity> {
  type: ToolbarElementType;
  iconName?: string;
  iconColor?: string;
  label?: string;
  content?: Lite<T>;
  url?: string;
  elements?: Array<ToolbarResponse<any>>;
  openInPopup?: boolean;
  autoRefreshPeriod?: number;
}
