import * as React from 'react'
import { IconProp } from '@fortawesome/fontawesome-svg-core'
import { ajaxGet } from '@framework/Services';
import * as Constructor from '@framework/Constructor';
import { EntitySettings } from '@framework/Navigator'
import * as Navigator from '@framework/Navigator'
import * as AppContext from '@framework/AppContext'
import * as Finder from '@framework/Finder'
import { Entity, Lite, liteKey, toLite, EntityPack, getToString } from '@framework/Signum.Entities'
import * as QuickLinks from '@framework/QuickLinks'
import { Type } from '@framework/Reflection'
import { onEmbeddedWidgets, EmbeddedWidget } from '@framework/Frames/Widgets'
import * as AuthClient from '../Authorization/AuthClient'
import * as ChartClient from '../Chart/ChartClient'
import * as UserChartClient from '../Chart/UserChart/UserChartClient'
import * as UserQueryClient from '../UserQueries/UserQueryClient'
import { DashboardPermission, DashboardEntity, ValueUserQueryListPartEntity, LinkListPartEntity, UserChartPartEntity, UserQueryPartEntity, IPartEntity, DashboardMessage, PanelPartEmbedded, ImagePartEntity, UserTreePartEntity } from './Signum.Entities.Dashboard'
import * as UserAssetClient from '../UserAssets/UserAssetClient'
import { ImportRoute } from "@framework/AsyncImport";
import { useAPI } from '../../../Framework/Signum.React/Scripts/Hooks';
import { ChartPermission } from '../Chart/Signum.Entities.Chart';


export interface PanelPartContentProps<T extends IPartEntity> {
  partEmbedded: PanelPartEmbedded;
  part: T;
  entity?: Lite<Entity>;
}

interface IconColor {
  icon: IconProp;
  iconColor: string;
}

export interface PartRenderer<T extends IPartEntity> {
  component: () => Promise<React.ComponentType<PanelPartContentProps<T>>>;
  defaultIcon: (element: T) => IconColor;
  withPanel?: (element: T) => boolean;
  handleTitleClick?: (part: T, entity: Lite<Entity> | undefined, e: React.MouseEvent<any>) => void;
  handleEditClick?: (part: T, entity: Lite<Entity> | undefined, e: React.MouseEvent<any>) => void;
}


export const partRenderers: { [typeName: string]: PartRenderer<IPartEntity> } = {};

export function start(options: { routes: JSX.Element[] }) {

  UserAssetClient.start({ routes: options.routes });
  UserAssetClient.registerExportAssertLink(DashboardEntity);

  Constructor.registerConstructor(DashboardEntity, () => DashboardEntity.New({ owner: AppContext.currentUser && toLite(AppContext.currentUser) }));

  Navigator.addSettings(new EntitySettings(DashboardEntity, e => import('./Admin/Dashboard')));

  Navigator.addSettings(new EntitySettings(ValueUserQueryListPartEntity, e => import('./Admin/ValueUserQueryListPart')));
  Navigator.addSettings(new EntitySettings(LinkListPartEntity, e => import('./Admin/LinkListPart')));
  Navigator.addSettings(new EntitySettings(UserChartPartEntity, e => import('./Admin/UserChartPart')));
  Navigator.addSettings(new EntitySettings(UserQueryPartEntity, e => import('./Admin/UserQueryPart')));
  Navigator.addSettings(new EntitySettings(ImagePartEntity, e => import('./Admin/ImagePartAdmin')));

  Finder.addSettings({ queryName: DashboardEntity, defaultOrderColumn: DashboardEntity.token(d => d.dashboardPriority), defaultOrderType: "Descending" });

  options.routes.push(<ImportRoute path="~/dashboard/:dashboardId" onImportModule={() => import("./View/DashboardPage")} />);

  registerRenderer(ValueUserQueryListPartEntity, {
    component: () => import('./View/ValueUserQueryListPart').then(a => a.default),
    defaultIcon: () => ({ icon: ["far", "list-alt"], iconColor: "lightblue" })
  });
  registerRenderer(LinkListPartEntity, {
    component: () => import('./View/LinkListPart').then(a => a.default),
    defaultIcon: () => ({ icon: ["far", "list-alt"], iconColor: "forestgreen" })
  });
  registerRenderer(ImagePartEntity, {
    component: () => import('./View/ImagePartView').then(a => a.default),
    defaultIcon: () => ({ icon: ["far", "list-alt"], iconColor: "forestgreen" }),
    withPanel: () => false
  });
  registerRenderer(UserChartPartEntity, {
    component: () => import('./View/UserChartPart').then(a => a.default),
    defaultIcon: () => ({ icon: "chart-bar", iconColor: "violet" }),
    handleEditClick: !Navigator.isViewable(UserChartPartEntity) || Navigator.isReadOnly(UserChartPartEntity) ? undefined :
      (p, e, ev) => {
        ev.preventDefault();
        AppContext.pushOrOpenInTab(Navigator.navigateRoute(p.userChart!), ev);
      },
    handleTitleClick: !AuthClient.isPermissionAuthorized(ChartPermission.ViewCharting) ? undefined :
      (p, e, ev) => {
        ev.preventDefault();
        ev.persist();
        UserChartClient.Converter.toChartRequest(p.userChart!, e)
          .then(cr => ChartClient.Encoder.chartPathPromise(cr, toLite(p.userChart!)))
          .then(path => AppContext.pushOrOpenInTab(path, ev))
          .done();
      },
  });

  registerRenderer(UserQueryPartEntity, {
    component: () => import('./View/UserQueryPart').then((a: any) => a.default),
    defaultIcon: () => ({ icon: ["far", "list-alt"], iconColor: "dodgerblue" }),
    withPanel: p => p.renderMode.indexOf("BigValue") == -1,
    handleEditClick: !Navigator.isViewable(UserQueryPartEntity) || Navigator.isReadOnly(UserQueryPartEntity) ? undefined :
      (p, e, ev) => {
        ev.preventDefault();
        AppContext.pushOrOpenInTab(Navigator.navigateRoute(p.userQuery!), ev);
      },
    handleTitleClick:
      (p, e, ev) => {
        ev.preventDefault();
        ev.persist();
        UserQueryClient.Converter.toFindOptions(p.userQuery!, e)
          .then(cr => AppContext.pushOrOpenInTab(Finder.findOptionsPath(cr, { userQuery: liteKey(toLite(p.userQuery!)) }), ev))
          .done()
      }
  });


  registerRenderer(UserTreePartEntity, {
    component: () => import('./View/UserTreePart').then((a: any) => a.default),
    defaultIcon: () => ({ icon: ["far", "list-alt"], iconColor: "dodgerblue" }),
    withPanel: p => true,
    handleEditClick: !Navigator.isViewable(UserTreePartEntity) || Navigator.isReadOnly(UserTreePartEntity) ? undefined :
      (p, e, ev) => {
        ev.preventDefault();
        AppContext.pushOrOpenInTab(Navigator.navigateRoute(p.userQuery!), ev);
      },
    handleTitleClick:
      (p, e, ev) => {
        ev.preventDefault();
        ev.persist();
        UserQueryClient.Converter.toFindOptions(p.userQuery!, e)
          .then(cr => AppContext.pushOrOpenInTab(Finder.findOptionsPath(cr, { userQuery: liteKey(toLite(p.userQuery!)) }), ev))
          .done()
      }
  });

  onEmbeddedWidgets.push(wc => {
    if (!wc.frame.pack.embeddedDashboards)
      return undefined;

    return wc.frame.pack.embeddedDashboards.map(d => {
      return {
        position: d.embeddedInEntity as "Top" | "Tab" | "Bottom",
        embeddedWidget: <DashboardWidget dashboard={d} pack={wc.frame.pack as EntityPack<Entity>} />,
        eventKey: liteKey(toLite(d)),
        title: d.displayName,
      } as EmbeddedWidget;
    });
  });

  QuickLinks.registerGlobalQuickLink(ctx => {
    if (!AuthClient.isPermissionAuthorized(DashboardPermission.ViewDashboard))
      return undefined;

    var promise = ctx.widgetContext ?
      Promise.resolve(ctx.widgetContext.frame.pack.dashboards ?? []) :
      API.forEntityType(ctx.lite.EntityType);

    return promise.then(das =>
      das.map(d => new QuickLinks.QuickLinkAction(liteKey(d), () => d.toStr ?? "", e => {
        AppContext.pushOrOpenInTab(dashboardUrl(d, ctx.lite), e)
      }, { icon: "tachometer-alt", iconColor: "darkslateblue" })));
  });

  QuickLinks.registerQuickLink(DashboardEntity, ctx => new QuickLinks.QuickLinkAction("preview", () => DashboardMessage.Preview.niceToString(),
    e => Navigator.API.fetchAndRemember(ctx.lite)
      .then(db => {
        if (db.entityType == undefined)
          AppContext.pushOrOpenInTab(dashboardUrl(ctx.lite), e);
        else
          Navigator.API.fetchAndRemember(db.entityType)
            .then(t => Finder.find({ queryName: t.cleanName }))
            .then(entity => {
              if (!entity)
                return;

              AppContext.pushOrOpenInTab(dashboardUrl(ctx.lite, entity), e);
            }).done();
      }).done()));
}

export function defaultIcon<T extends IPartEntity>(part: T) {
  return partRenderers[part.Type].defaultIcon(part);
}

export function dashboardUrl(lite: Lite<DashboardEntity>, entity?: Lite<Entity>) {
  return "~/dashboard/" + lite.id + (!entity ? "" : "?entity=" + liteKey(entity));
}

export function registerRenderer<T extends IPartEntity>(type: Type<T>, renderer: PartRenderer<T>) {
  partRenderers[type.typeName] = renderer as PartRenderer<any> as PartRenderer<IPartEntity>;
}

export module API {
  export function forEntityType(type: string): Promise<Lite<DashboardEntity>[]> {
    return ajaxGet({ url: `~/api/dashboard/forEntityType/${type}` });
  }

  export function home(): Promise<Lite<DashboardEntity> | null> {
    return ajaxGet({ url: "~/api/dashboard/home" });
  }
}

declare module '@framework/Signum.Entities' {

  export interface EntityPack<T extends ModifiableEntity> {
    dashboards?: Array<Lite<DashboardEntity>>;
    embeddedDashboards?: DashboardEntity[];
  }
}

export interface DashboardWidgetProps {
  pack: EntityPack<Entity>;
  dashboard: DashboardEntity;
}

export function DashboardWidget(p: DashboardWidgetProps) {

  const component = useAPI(() => import("./View/DashboardView").then(mod => mod.default), []);

  if (!component)
    return null;

  return React.createElement(component, {
    dashboard: p.dashboard,
    entity: p.pack.entity
  });
}

