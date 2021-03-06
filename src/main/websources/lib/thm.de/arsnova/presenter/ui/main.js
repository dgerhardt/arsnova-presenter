/*
 * Copyright 2013 Daniel Gerhardt <anp-dev@z.dgerhardt.net> <daniel.gerhardt@mni.thm.de>
 *
 * This file is part of ARSnova Presenter.
 *
 * Presenter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
define(
	[
		"dojo/_base/config",
		"dojo/on",
		"dojo/dom-construct",
		"dojo/dom-geometry",
		"dojo/dom-style",
		"dojo/date/locale",
		"dijit/a11yclick",
		"dijit/layout/BorderContainer",
		"dgerhardt/dijit/layout/ContentPane",
		"dijit/form/Button",
		"dijit/form/ComboButton",
		"dijit/form/DropDownButton",
		"dijit/Menu",
		"dijit/MenuItem",
		"dijit/Tooltip",
		"dojo/_base/fx",
		"dgerhardt/common/fullscreen",
		"arsnova-presenter/ui/timer",
		"arsnova-presenter/ui/infoDialog"
	],
	function(config, on, domConstruct, domGeometry, domStyle, dateLocale, a11yclick, BorderContainer, ContentPane, Button, ComboButton, DropDownButton, Menu, MenuItem, Tooltip, fx, fullScreen, timer, infoDialog) {
		"use strict";

		var
			MIN_WIDTH = 980,
			MIN_HEIGHT = 600,
			self = null,

			/* declarations of private "methods" */
			updateTime = null,

			/* DOM */
			timeNode = null,

			/* Dijit */
			appContainer = null,
			mainContainer = null,
			headerPane = null,
			footerPane = null,
			fullScreenContainer = null,
			timeTooltip = null
		;

		self = {
			/* public "methods" */
			init: function() {
				console.log("-- UI: main.init --");

				var appContainerNode = domConstruct.create("div", {id: "appContainer", style: "visibility: hidden"}, document.body);

				appContainer = new BorderContainer({
					id: "appContainer",
					design: "headline"
				}, appContainerNode);
				mainContainer = new BorderContainer({
					id: "mainContainer",
					region: "center"
				});
				headerPane = new ContentPane({
					id: "headerPane",
					region: "top",
					"class": "sidePanel"
				});
				footerPane = new ContentPane({
					id: "footerPane",
					region: "bottom",
					"class": "sidePanel"
				});

				appContainer.addChild(mainContainer);
				appContainer.addChild(headerPane);
				appContainer.addChild(footerPane);

				/* Add dom nodes needed for full screen mode */
				fullScreenContainer = new BorderContainer({
					id: "fullScreenContainer"
				});
				fullScreenContainer.addChild(new ContentPane({
					id: "fullScreenHeader",
					region: "top"
				}));
				fullScreenContainer.addChild(new ContentPane({
					id: "fullScreenContent",
					region: "center"
				}));
				fullScreenContainer.placeAt(document.body);

				/* device resolution check */
				var lowResNode = domConstruct.create("div", {id: "lowResolution"}, document.body);
				domStyle.set(lowResNode, "visibility", "hidden");
				var lowResContentWrapperNode = domConstruct.create("div", null, lowResNode);
				domConstruct.create("img", {src: "images/arsnova.png", alt: "ARSnova"},
					domConstruct.create("h1", null,
						domConstruct.create("header", null, lowResContentWrapperNode)
					)
				);
				var lowResMessage = domConstruct.create("p", {id: "lowResolutionMessage"}, lowResContentWrapperNode);
				new Button({
					label: "ARSnova mobile",
					onClick: function() {
						location.href = config.arsnova.mobileUrl;
					}
				}).placeAt(
					domConstruct.create("p", null, lowResContentWrapperNode)
				).startup();
				var resizeLog = "";
				var resizeLogTimeout = null;
				var windowOnResize = function(event) {
					if (document.body.clientWidth < MIN_WIDTH || document.body.clientHeight < MIN_HEIGHT) {
						/* iPad does not swap screen.availWidth with screen.availHeight in landscape orientation */
						if ((screen.availWidth < MIN_WIDTH && screen.availHeight < MIN_WIDTH) || screen.availHeight < MIN_HEIGHT) {
							resizeLog = "Small resolution detected: " + screen.availWidth + "x" + screen.availHeight;
							lowResMessage.innerHTML = "This application cannot be run because the resolution requirements are not met. ARSnova Presenter is optimized for notebook, tablet and desktop devices. If you are using a tablet and see this message, please try landscape orientation.";
						} else {
							resizeLog = "Small window detected: " + document.body.clientWidth + "x" + document.body.clientHeight;
							lowResMessage.innerHTML = "This application cannot be run because the resolution requirements are not met. Please increase the size of your browser's window or reduce the zoom factor (if zooming is active).";
						}
						domStyle.set(appContainer, "visibility", "hidden");
						domStyle.set(lowResNode, "visibility", "visible");
					} else {
						resizeLog = "Acceptable client size detected: " + document.body.clientWidth + "x" + document.body.clientHeight;
						domStyle.set(lowResNode, "visibility", "hidden");
						domStyle.set(appContainer, "visibility", "visible");
					}
					if (resizeLogTimeout) {
						clearTimeout(resizeLogTimeout);
					}
					resizeLogTimeout = setTimeout(function() {
						console.log(resizeLog);
					}, 500);
				};
				on(window, "resize", windowOnResize);
				windowOnResize();
			},

			startup: function() {
				appContainer.startup();
				domStyle.set(appContainer.domNode, "visibility", "visible");
				fullScreen.setPageNode(appContainer.domNode);

				/* Add header content */
				var exitPanelNode = domConstruct.create("div", {id: "exitPanel"}, headerPane.domNode);

				var fullScreenMenu = new Menu({id: "fullScreenMenu", style: "display: none"});
				/* Menu items are added in the specific UI modules */
				new ComboButton({
					label: "Full screen",
					onClick: self.toggleFullScreenMode,
					dropDown: fullScreenMenu
				}, domConstruct.create("button", {id: "fullScreenButton", type: "button"}, exitPanelNode)).startup();

				var modeMenu = new Menu({
					id: "modeMenu",
					style: "display: none"
				});
				modeMenu.addChild(new MenuItem({
					label: "Presentation"
				}));
				modeMenu.addChild(new MenuItem({
					label: "Editing",
					disabled: true
				}));
				modeMenu.addChild(new MenuItem({
					id: "mobileLecturersViewMenuItem",
					label: "Mobile (lecturer's view)",
					disabled: true
				}));
				modeMenu.addChild(new MenuItem({
					id: "mobileStudentsViewMenuItem",
					label: "Mobile (student's view)",
					disabled: true
				}));
				new DropDownButton({
					label: "Mode",
					dropDown: modeMenu
				}, domConstruct.create("button", {id: "mobileButton", type: "button"}, exitPanelNode)).startup();

				/* Add footer content */
				var productInfoNode = domConstruct.create("span", {id: "productInfo"}, footerPane.domNode);
				domConstruct.create("span", {id: "productLogo", title: "ARSnova"}, productInfoNode);
				domConstruct.create("span", {id: "productName", "class": "groupPanel", innerHTML: "Presenter"}, productInfoNode);
				var productMenu = new Menu({
					targetNodeIds: ["productInfo"],
					leftClickToOpen: true
				});
				productMenu.addChild(new MenuItem({
					label: "About Presenter",
					onClick: infoDialog.show
				}));
				productMenu.addChild(new MenuItem({
					label: "ARSnova website",
					onClick: function() {
						window.open("http://blog.mni.thm.de/arsnova/arsnova-blog/", "_blank");
					}
				}));
				productMenu.startup();

				if (config.arsnova.organization) {
					var org = config.arsnova.organization;
					domConstruct.create("span", {id: "footerOrganizationInfo", innerHTML: org.label}, footerPane.domNode);

					if (org.links) {
						var organizationMenu = new Menu({
							targetNodeIds: ["footerOrganizationInfo"],
							leftClickToOpen: true
						});
						org.links.forEach(function(link) {
							organizationMenu.addChild(new MenuItem({
								label: link.label,
								onClick: function() {
									window.open(link.url, "_blank");
								}
							}));
						});
					};
				}

				timeNode = domConstruct.create("div", {id: "footerTime", tabindex: 0}, footerPane.domNode);
				timeTooltip = new Tooltip({
					connectId: [timeNode],
					position: ["above-centered"]
				});
				setInterval(updateTime, 500);
				updateTime();
				on(timeNode, a11yclick, function() {
					timer.showSettings();
				});

				/* prevent window scrolling (needed for IE) */
				on(window, "scroll", function(event) {
					scrollTo(0, 0);
					console.debug("Prevented document scrolling");
				});

				/* Full screen mode */
				fullScreenContainer.startup();
				var fullScreenLogo = domConstruct.create("img", {id: "fullScreenLogo", src: "images/arsnova.png"}, fullScreenContainer.domNode);
				fullScreen.onChange(function(event, isActive) {
					if (isActive) {
						console.log("Full screen mode enabled");
						domStyle.set(fullScreenContainer.domNode, "display", "block");

						/* calculate logo size */
						var docGeometry = domGeometry.getContentBox(document.body);
						var vRatio = docGeometry.h / 30.0;
						var ratio = fullScreenLogo.offsetWidth / fullScreenLogo.offsetHeight;
						domStyle.set(fullScreenLogo, "height", vRatio);
						domStyle.set(fullScreenLogo, "width", (vRatio * ratio) + "px");
						domStyle.set(fullScreenLogo, "display", "block");

						fullScreenContainer.resize();
					} else {
						console.log("Full screen mode disabled");
						domStyle.set(fullScreenContainer.domNode, "display", "none");
					}
				});

				appContainer.resize();
			},

			hideSplash: function(leaveBg) {
				if (leaveBg) {
					domStyle.set("splash-content", "display", "none");
				} else {
					fx.fadeOut({
						node: "splash-bg",
						duration: 500,
						onEnd: function() {
							domStyle.set("splash", "display", "none");
						}
					}).play();
					fx.fadeOut({
						node: "splash-content",
						duration: 500
					}).play();
				}
			},

			toggleFullScreenMode: function() {
				fullScreen.toggle();
			}
		};

		/* private "methods" */
		updateTime = function() {
			var date = new Date();
			timeNode.innerHTML = dateLocale.format(date, {selector: "time", formatLength: "short"});
			timeTooltip.set("label", dateLocale.format(date, {selector: "date", formatLength: "short"}));
		};

		return self;
	}
);
