import * as React from 'react'
import { ModifiableEntity, EntityPack, is, OperationSymbol } from '@framework/Signum.Entities';
import { ifError } from '@framework/Globals';
import { ajaxPost, ajaxGet, ajaxGetRaw, saveFile, ServiceError } from '@framework/Services';
import * as Services from '@framework/Services';
import { EntitySettings } from '@framework/Navigator'
import { tasks, LineBaseProps, LineBaseController } from '@framework/Lines/LineBase'
import { FormGroup, TypeContext } from '@framework/Lines'
import * as AppContext from '@framework/AppContext'
import * as Navigator from '@framework/Navigator'
import * as Finder from '@framework/Finder'
import * as QuickLinks from '@framework/QuickLinks'
import { EntityOperationSettings } from '@framework/Operations'
import { PropertyRouteEntity } from '@framework/Signum.Entities.Basics'
import { PseudoType, getTypeInfo, OperationInfo, getQueryInfo, GraphExplorer, PropertyRoute, tryGetTypeInfo } from '@framework/Reflection'
import * as Operations from '@framework/Operations'
import { UserEntity, RoleEntity, UserOperation, PermissionSymbol, PropertyAllowed, TypeAllowedBasic, AuthAdminMessage, BasicPermission, LoginAuthMessage } from './Signum.Entities.Authorization'
import { PermissionRulePack, TypeRulePack, OperationRulePack, PropertyRulePack, QueryRulePack, QueryAllowed } from './Signum.Entities.Authorization'
import * as OmniboxClient from '../Omnibox/OmniboxClient'
import Login, { LoginWithWindowsButton } from './Login/Login';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { isPermissionAuthorized } from './AuthClient';

export let types: boolean;
export let properties: boolean;
export let operations: boolean;
export let queries: boolean;
export let permissions: boolean;

export function start(options: { routes: JSX.Element[], types: boolean; properties: boolean, operations: boolean, queries: boolean; permissions: boolean }) {

  types = options.types;
  properties = options.properties;
  operations = options.operations;
  queries = options.queries;
  permissions = options.permissions;

  Navigator.addSettings(new EntitySettings(UserEntity, e => import('./Templates/User')));
  Navigator.addSettings(new EntitySettings(RoleEntity, e => import('./Templates/Role')));
  Operations.addSettings(new EntityOperationSettings(UserOperation.SetPassword, { isVisible: ctx => false }));

  Finder.ButtonBarQuery.onButtonBarElements.push(ctx => ctx.findOptions.queryKey == RoleEntity.typeName && isPermissionAuthorized(BasicPermission.AdminRules) ? {
    order: 6,
    button: <button className="btn btn-info"
      onClick={e => { e.preventDefault(); API.downloadAuthRules(); }}>
      <FontAwesomeIcon icon="download" /> Download AuthRules.xml
      </button>
  } : undefined)

  if (options.properties) {
    tasks.push(taskAuthorizeProperties);
    GraphExplorer.TypesLazilyCreated.push(PropertyRouteEntity.typeName);
    Navigator.addSettings(new EntitySettings(PropertyRulePack, e => import('./Admin/PropertyRulePackControl')));
  }

  if (options.types) {
    Navigator.isCreableEvent.push(navigatorIsCreable);
    Navigator.isReadonlyEvent.push(navigatorIsReadOnly);
    Navigator.isViewableEvent.push(navigatorIsViewable);
    Operations.Options.maybeReadonly = ti => ti.maxTypeAllowed == "Write" && ti.minTypeAllowed != "Write";
    Navigator.addSettings(new EntitySettings(TypeRulePack, e => import('./Admin/TypeRulePackControl')));

    QuickLinks.registerQuickLink(RoleEntity, ctx => new QuickLinks.QuickLinkAction("types", () => AuthAdminMessage.TypeRules.niceToString(),
      e => API.fetchTypeRulePack(ctx.lite.id!).then(pack => Navigator.navigate(pack)).done(),
      { isVisible: isPermissionAuthorized(BasicPermission.AdminRules), icon: "shield-alt", iconColor: "red", color: "danger", group: null }));
  }

  if (options.operations) {
    Navigator.addSettings(new EntitySettings(OperationRulePack, e => import('./Admin/OperationRulePackControl')));
  }

  if (options.queries) {
    Finder.isFindableEvent.push(queryIsFindable);

    Navigator.addSettings(new EntitySettings(QueryRulePack, e => import('./Admin/QueryRulePackControl')));
  }

  if (options.permissions) {

    Navigator.addSettings(new EntitySettings(PermissionRulePack, e => import('./Admin/PermissionRulePackControl')));

    QuickLinks.registerQuickLink(RoleEntity, ctx => new QuickLinks.QuickLinkAction("permissions", () => AuthAdminMessage.PermissionRules.niceToString(),
      e => API.fetchPermissionRulePack(ctx.lite.id!).then(pack => Navigator.navigate(pack)).done(),
      { isVisible: isPermissionAuthorized(BasicPermission.AdminRules), icon: "shield-alt", iconColor: "orange", color: "warning", group: null }));
  }

  OmniboxClient.registerSpecialAction({
    allowed: () => isPermissionAuthorized(BasicPermission.AdminRules),
    key: "DownloadAuthRules",
    onClick: () => { API.downloadAuthRules(); return Promise.resolve(undefined); }
  });

  PropertyRoute.prototype.canModify = function () {
    return this.member != null && this.member.propertyAllowed == "Write"
  }
}

export function queryIsFindable(queryKey: string, fullScreen: boolean) {
  var allowed = getQueryInfo(queryKey).queryAllowed;

  return allowed == "Allow" || allowed == "EmbeddedOnly" && !fullScreen;
}

export function taskAuthorizeProperties(lineBase: LineBaseController<LineBaseProps>, state: LineBaseProps) {
  if (state.ctx.propertyRoute &&
    state.ctx.propertyRoute.propertyRouteType == "Field") {

    const member = state.ctx.propertyRoute.member;

    switch (member!.propertyAllowed) {
      case "None":
        //state.visible = false;  //None is just not retuning the member info, LineBaseController.isHidden
        break;
      case "Read":
        state.ctx.readOnly = true;
        break;
      case "Write":
        break;
    }
  }
}

export function navigatorIsReadOnly(typeName: PseudoType, entityPack?: EntityPack<ModifiableEntity>, options?: Navigator.IsReadonlyOptions) {

  if (options?.isEmbedded)
    return false;

  const ti = tryGetTypeInfo(typeName);
  if (ti == undefined)
    return true;

  if (entityPack?.typeAllowed)
    return entityPack.typeAllowed == "None" || entityPack.typeAllowed == "Read";

  return ti.maxTypeAllowed == "None" || ti.maxTypeAllowed == "Read";
}

export function navigatorIsViewable(typeName: PseudoType, entityPack?: EntityPack<ModifiableEntity>, options?: Navigator.IsViewableOptions) {

  if (options?.isEmbedded)
    return true;

  const ti = tryGetTypeInfo(typeName);

  if (ti == undefined)
    return false;

  if (entityPack?.typeAllowed)
    return entityPack.typeAllowed != "None";

  return ti.maxTypeAllowed != "None";
}

export function navigatorIsCreable(typeName: PseudoType, options?: Navigator.IsCreableOptions) {

  if (options?.isEmbedded)
    return true;

  const ti = tryGetTypeInfo(typeName);

  return ti != null && ti.maxTypeAllowed == "Write";
}

export module API {

  export function fetchPermissionRulePack(roleId: number | string): Promise<PermissionRulePack> {
    return ajaxGet({ url: "~/api/authAdmin/permissionRules/" + roleId, cache: "no-cache" });
  }

  export function savePermissionRulePack(rules: PermissionRulePack): Promise<void> {
    return ajaxPost({ url: "~/api/authAdmin/permissionRules" }, rules);
  }


  export function fetchTypeRulePack(roleId: number | string): Promise<TypeRulePack> {
    return ajaxGet({ url: "~/api/authAdmin/typeRules/" + roleId, cache: "no-cache" });
  }

  export function saveTypeRulePack(rules: TypeRulePack): Promise<void> {
    return ajaxPost({ url: "~/api/authAdmin/typeRules" }, rules);
  }


  export function fetchPropertyRulePack(typeName: string, roleId: number | string): Promise<PropertyRulePack> {
    return ajaxGet({ url: "~/api/authAdmin/propertyRules/" + typeName + "/" + roleId, cache: "no-cache" });
  }

  export function savePropertyRulePack(rules: PropertyRulePack): Promise<void> {
    return ajaxPost({ url: "~/api/authAdmin/propertyRules" }, rules);
  }



  export function fetchOperationRulePack(typeName: string, roleId: number | string): Promise<OperationRulePack> {
    return ajaxGet({ url: "~/api/authAdmin/operationRules/" + typeName + "/" + roleId, cache: "no-cache" });
  }

  export function saveOperationRulePack(rules: OperationRulePack): Promise<void> {
    return ajaxPost({ url: "~/api/authAdmin/operationRules" }, rules);
  }



  export function fetchQueryRulePack(typeName: string, roleId: number | string): Promise<QueryRulePack> {
    return ajaxGet({ url: "~/api/authAdmin/queryRules/" + typeName + "/" + roleId, cache: "no-cache" });
  }

  export function saveQueryRulePack(rules: QueryRulePack): Promise<void> {
    return ajaxPost({ url: "~/api/authAdmin/queryRules" }, rules);
  }



  export function downloadAuthRules(): void {
    ajaxGetRaw({ url: "~/api/authAdmin/downloadAuthRules" })
      .then(response => saveFile(response))
      .done();
  }

}

declare module '@framework/Reflection' {

  export interface TypeInfo {
    minTypeAllowed: TypeAllowedBasic;
    maxTypeAllowed: TypeAllowedBasic;
    queryAllowed: QueryAllowed;
  }

  export interface MemberInfo {
    propertyAllowed: PropertyAllowed;
    queryAllowed: QueryAllowed;
  }

  export interface PropertyRoute {
    canModify(): boolean;
  }
}

declare module '@framework/Signum.Entities' {

  export interface EntityPack<T extends ModifiableEntity> {
    typeAllowed?: TypeAllowedBasic;
  }
}

