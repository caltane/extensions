import * as React from 'react'
import * as History from 'history'
import { classes } from '@framework/Globals'
import * as AppContext from '@framework/AppContext'
import * as Navigator from '@framework/Navigator'
import { ToolbarLocation } from '../Signum.Entities.Toolbar'
import * as ToolbarClient from '../ToolbarClient'
import { ToolbarConfig } from "../ToolbarClient";
import { ToolbarEntity } from "../Signum.Entities.Toolbar";
import '@framework/Frames/MenuIcons.css'
import './Toolbar.css'
import * as PropTypes from "prop-types";
import { NavDropdown, Dropdown } from 'react-bootstrap';
import { Nav, Navbar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { coalesceIcon } from '@framework/Operations/ContextualOperations';
import { useAPI, useUpdatedRef, useHistoryListen, useForceUpdate } from '@framework/Hooks'
import { QueryString } from '@framework/QueryString'
import { parseIcon } from '../../Basics/Templates/IconTypeahead'


function isCompatibleWithUrl(r: ToolbarClient.ToolbarResponse<any>, location: History.Location, query: any): boolean {
  if (r.url)
    return (location.pathname + location.search).startsWith(AppContext.toAbsoluteUrl(r.url));

  if (!r.content)
    return false;

  var config = ToolbarClient.configs[r.content.EntityType];
  if (!config)
    return false;

  return config.isCompatibleWithUrl(r, location, query);
}

function inferActive(r: ToolbarClient.ToolbarResponse<any>, location: History.Location, query: any): ToolbarClient.ToolbarResponse<any> | null {
  if (r.elements)
    return r.elements.map(e => inferActive(e, location, query)).notNull().onlyOrNull();

  if (isCompatibleWithUrl(r, location, query))
    return r;

  return null;
}

export default function ToolbarRenderer(p: { location?: ToolbarLocation; }): React.ReactElement | null {
  const forceUpdate = useForceUpdate();
  const response = useAPI(() => ToolbarClient.API.getCurrentToolbar(p.location!), [p.location]);
  const responseRef = useUpdatedRef(response);
  const [expanded, setExpanded] = React.useState<ToolbarClient.ToolbarResponse<any>[]>([]);
  const [avoidCollapse, setAvoidCollapse] = React.useState<ToolbarClient.ToolbarResponse<any>[]>([]);

  const [active, setActive] = React.useState<ToolbarClient.ToolbarResponse<any> | null>(null);
  const activeRef = useUpdatedRef(active);

  useHistoryListen((location: History.Location, action: History.Action) => {
    var query = QueryString.parse(location.search);
    if (responseRef.current) {
      if (activeRef.current && isCompatibleWithUrl(activeRef.current, location, query)) {
        return;
      }

      var newActive = inferActive(responseRef.current, location, query);
      setActive(newActive);
    }
  }, response != null);

  if (!response)
    return null;

  if (p.location == "Top") {

    var navItems = response.elements && response.elements.map((res, i) => withKey(renderNavItem(res, i), i));

    return (
      <div className={classes("nav navbar-nav")}>
        {navItems}
      </div>
    );
  }
  else
    return (
      <div className="nav">
        {response.elements && response.elements.flatMap(sr => renderDropdownItem(sr, 0, false, response)).map((sr, i) => withKey(sr, i))}
      </div>
    );


  function handleOnToggle(res: ToolbarClient.ToolbarResponse<any>) {

    if (avoidCollapse.contains(res))
      avoidCollapse.remove(res);
    else
    if (!expanded.contains(res))
      expanded.push(res);
    else
      expanded.clear();

    forceUpdate();
  }

  function renderNavItem(res: ToolbarClient.ToolbarResponse<any>, index: number) {

    switch (res.type) {

      case "Divider":
        return (
          <Nav.Item>{"|"}</Nav.Item>
        );

      case "Header":
      case "Item":
        if (res.elements && res.elements.length) {
          var title = res.label ?? res.content!.toStr;
          var icon = getIcon(res);

          return (
            <Dropdown
              onToggle={() => handleOnToggle(res)}
              show={expanded.contains(res)}>
              <Dropdown.Toggle id="dropdown-toolbar" as={CustomToggle} onClick={() => handleOnToggle(res)}>
                {!icon ? title : (<span>{icon}{title}</span>)}
              </Dropdown.Toggle>
              <Dropdown.Menu alignRight={AppContext.isRtl()}>
                {res.elements && res.elements.flatMap(sr => renderDropdownItem(sr, 0, true, res)).map((sr, i) => withKey(sr, i))}
              </Dropdown.Menu>
            </Dropdown>
          );
        }

        if (res.url) {
          return (
            <Nav.Item>
              <Nav.Link
                onClick={(e: React.MouseEvent<any>) => AppContext.pushOrOpenInTab(res.url!, e)}
                onAuxClick={(e: React.MouseEvent<any>) => AppContext.pushOrOpenInTab(res.url!, e)}
                active={res == active}>
                {ToolbarConfig.coloredIcon(parseIcon(res.iconName), res.iconColor)}{res.label}
              </Nav.Link>
            </Nav.Item>
          );
        }

        if (res.content) {
          var config = ToolbarClient.configs[res.content!.EntityType];
          if (!config)
            return <Nav.Item style={{ color: "red" }}>{res.content!.EntityType + "ToolbarConfig not registered"}</Nav.Item>;

          return (
            <Nav.Item>
              <Nav.Link
                onClick={(e: React.MouseEvent<any>) => config.handleNavigateClick(e, res)}
                onAuxClick={(e: React.MouseEvent<any>) => config.handleNavigateClick(e, res)} active={res == active}>
                {config.getIcon(res)}{res.label}
              </Nav.Link>
            </Nav.Item>
          );
        }

        if (res.type == "Header") {
          return (
            <Nav.Item>{getIcon(res)}{res.label}</Nav.Item>
          );
        }

        return <Nav.Item style={{ color: "red" }}>{"No Content or Url found"}</Nav.Item>;

      default:
        throw new Error("Unexpected " + res.type);
    }
  }



  function handleClick(e: React.MouseEvent<any>, res: ToolbarClient.ToolbarResponse<any>, topRes: ToolbarClient.ToolbarResponse<any>) {

    avoidCollapse.push(topRes);

    var path = findPath(res, [topRes]);

    if (!path)
      throw new Error("Path not found");

    if (expanded.contains(res))
      path.pop();

    setExpanded(path);
  }

  function renderDropdownItem(res: ToolbarClient.ToolbarResponse<any>, indent: number, isNavbar: boolean, topRes: ToolbarClient.ToolbarResponse<any>): React.ReactElement<any>[] {

    const menuItemN = "menu-item-" + indent;

    switch (res.type) {

      case "Divider":
        return [
          isNavbar ?
            <NavDropdown.Divider className={menuItemN} /> :
            <Dropdown.Divider className={menuItemN} />
        ];

      case "Header":
      case "Item":

        var HeaderOrItem: typeof Dropdown.Item =
          (isNavbar ?
            (res.type == "Header" ? NavDropdown.Header as any : NavDropdown.Item) :
            (res.type == "Header" ? Dropdown.Header as any : Dropdown.Item));

        if (res.elements && res.elements.length) {
          return [
            <HeaderOrItem onClick={(e: React.MouseEvent<any>) => handleClick(e, res, topRes)}
              className={classes(menuItemN, "sf-cursor-pointer")}>
              {getIcon(res)}{res.label ?? res.content!.toStr}<FontAwesomeIcon icon={expanded.contains(res) ? "chevron-down" : "chevron-right"} className="arrow-align" />
            </HeaderOrItem>
          ].concat(res.elements && res.elements.length && expanded.contains(res) ? res.elements.flatMap(r => renderDropdownItem(r, indent + 1, isNavbar, topRes)) : [])
        }

        if (res.url) {
          return [
            <HeaderOrItem
              onClick={(e: React.MouseEvent<any>) => AppContext.pushOrOpenInTab(res.url!, e)}
              onAuxClick={(e: React.MouseEvent<any>) => AppContext.pushOrOpenInTab(res.url!, e)}
              className={classes("sf-cursor-pointer", menuItemN, res == active && "active")} >
              {ToolbarConfig.coloredIcon(parseIcon(res.iconName), res.iconColor)}{res.label}
            </HeaderOrItem>
          ];
        }

        if (res.content) {
          var config = ToolbarClient.configs[res.content!.EntityType];
          if (!config) {
            return [
              <HeaderOrItem style={{ color: "red" }} className={menuItemN}>
                {res.content!.EntityType + "ToolbarConfig not registered"}
              </HeaderOrItem>
            ];
          }

          return [
            <HeaderOrItem
              onClick={(e: React.MouseEvent<any>) => config.handleNavigateClick(e, res)}
              onAuxClick={(e: React.MouseEvent<any>) => config.handleNavigateClick(e, res)}
              className={classes("sf-cursor-pointer", menuItemN, res == active && "active")}>
              {config.getIcon(res)}{res.label}
            </HeaderOrItem>
          ];
        }

        if (res.type == "Header")
          return [
            <HeaderOrItem className={menuItemN}>{getIcon(res)}{res.label}</HeaderOrItem>
          ];

        return [
          <Dropdown.Item style={{ color: "red" }} className={menuItemN}>
            {"No Content or Url found"}
          </Dropdown.Item>
        ];

      default: throw new Error("Unexpected " + res.type);
    }
  }

  function getIcon(res: ToolbarClient.ToolbarResponse<any>) {

    var icon = parseIcon(res.iconName);

    return icon && <FontAwesomeIcon icon={icon} className={"icon"} color={res.iconColor} fixedWidth />
  }
}

ToolbarRenderer.defaultProps = { location: "Top" as ToolbarLocation, tag: true };

function withKey(e: React.ReactElement<any>, index: number) {
  return React.cloneElement(e, { key: index });
}

function findPath(target: ToolbarClient.ToolbarResponse<any>, list: ToolbarClient.ToolbarResponse<any>[]): ToolbarClient.ToolbarResponse<any>[] | null {

  const last = list.last();

  if (last.elements) {
    for (let i = 0; i < last.elements.length; i++) {
      const elem = last.elements[i];

      list.push(elem);

      if (elem == target)
        return list;

      var result = findPath(target, list);

      if (result)
        return result;

      list.pop();
    }
  }

  return null;
}

const CustomToggle = React.forwardRef(function CustomToggle(p: { children: React.ReactNode, onClick: React.MouseEventHandler }, ref: React.Ref<HTMLAnchorElement>) {

  return (
    <a
      ref={ref}
      className="dropdown-toggle nav-link"
      href="#"
      onClick={e => { e.preventDefault(); p.onClick(e); }}>
      {p.children}
    </a>
  );
});

