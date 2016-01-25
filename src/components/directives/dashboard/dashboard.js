/*
 * Copyright (c) 2014 DataTorrent, Inc. ALL Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('ui.dashboard', ['ui.bootstrap', 'gridster']);

angular.module('ui.dashboard')

  .directive('dashboard', ['WidgetModel', 'WidgetDefCollection', '$uibModal', 'DashboardState', '$log', function (WidgetModel, WidgetDefCollection, $uibModal, DashboardState, $log) {

    return {
      restrict: 'A',
      templateUrl: function(element, attr) {
        return attr.templateUrl ? attr.templateUrl : 'components/directives/dashboard/dashboard.html';
      },
      scope: true,

      controller: ['$scope', '$attrs', function (scope, attrs) {
        // default options
        var defaults = {
          stringifyStorage: true,
          hideWidgetSettings: false,
          hideWidgetClose: false,
          settingsModalOptions: {
            templateUrl: 'components/directives/dashboard/widget-settings-template.html',
            controller: 'WidgetSettingsCtrl'
          },
          onSettingsClose: function(result, widget) { // NOTE: dashboard scope is also passed as 3rd argument
            jQuery.extend(true, widget, result);
          },
          onSettingsDismiss: function(reason) { // NOTE: dashboard scope is also passed as 2nd argument
            $log.info('widget settings were dismissed. Reason: ', reason);
          }
        };

        // from dashboard="options"
        scope.options = scope.$eval(attrs.dashboard);

        // Deep options
        scope.options.settingsModalOptions = scope.options.settingsModalOptions || {};
        _.each(['settingsModalOptions'], function(key) {
          // Ensure it exists on scope.options
          scope.options[key] = scope.options[key] || {};
          // Set defaults
          _.defaults(scope.options[key], defaults[key]);
        });

        // Shallow options
        _.defaults(scope.options, defaults);

        // gridster options
        var gridsterDefaults = {
    			resizable : {
    				enabled : true,
    				resize : function(event, element, widget) {
    					var newHeight = element[0].offsetHeight;
    					var newWidth = element[0].clientWidth;
    					scope.$broadcast('resizingWidget', {
    						height : newHeight,
    						width : newWidth
    					});
    					// $scope.$emit('widgetChanged', widget);
    				}
    			},
    			draggable : {
    				enabled : true, 
    				handle : '.widget-header', 
    				stop : function(event, element, widget) {
    					scope.$emit('widgetChanged', widget);
    				}
    			}
        };
        scope.gridsterOptions = angular.extend({}, gridsterDefaults, scope.options.gridsterOptions || {});

      }],
      link: function (scope) {

        // Save default widget config for reset
        scope.defaultWidgets = scope.options.defaultWidgets;

        scope.widgetDefs = new WidgetDefCollection(scope.options.widgetDefinitions);
        var count = 1;

        // Instantiate new instance of dashboard state
        scope.dashboardState = new DashboardState(
          scope.options.storage,
          scope.options.storageId,
          scope.options.storageHash,
          scope.widgetDefs,
          scope.options.stringifyStorage
        );

        /**
         * Instantiates a new widget on the dashboard
         * @param {Object} widgetToInstantiate The definition object of the widget to be instantiated
         */
        scope.addWidget = function (widgetToInstantiate, doNotSave) {

          if (typeof widgetToInstantiate === 'string') {
            widgetToInstantiate = {
              name: widgetToInstantiate
            };
          }

          var defaultWidgetDefinition = scope.widgetDefs.getByName(widgetToInstantiate.name);
          if (!defaultWidgetDefinition) {
            throw 'Widget ' + widgetToInstantiate.name + ' is not found.';
          }

          // Determine the title for the new widget
          var title;
          if (!widgetToInstantiate.title && !defaultWidgetDefinition.title) {
            widgetToInstantiate.title = 'Widget ' + count++;
          }

          // Instantiation
          var widget = new WidgetModel(defaultWidgetDefinition, widgetToInstantiate);

          // Add to the widgets array
          scope.widgets.push(widget);
          if (!doNotSave) {
            scope.saveDashboard();
          }

          return widget;
        };

        /**
         * Removes a widget instance from the dashboard
         * @param  {Object} widget The widget instance object (not a definition object)
         */
        scope.removeWidget = function (widget) {
          scope.widgets.splice(_.indexOf(scope.widgets, widget), 1);
          scope.saveDashboard();
        };

        /**
         * Opens a dialog for setting and changing widget properties
         * @param  {Object} widget The widget instance object
         */
        scope.openWidgetSettings = function (widget) {

          // Set up $uibModal options 
          var options = _.defaults(
            { scope: scope },
            widget.settingsModalOptions,
            scope.options.settingsModalOptions);

          // Ensure widget is resolved
          options.resolve = {
            widget: function () {
              return widget;
            }
          };
          
          // Create the modal
          var modalInstance = $uibModal.open(options);
          var onClose = widget.onSettingsClose || scope.options.onSettingsClose;
          var onDismiss = widget.onSettingsDismiss || scope.options.onSettingsDismiss;

          // Set resolve and reject callbacks for the result promise
          modalInstance.result.then(
            function (result) {

              // Call the close callback
              onClose(result, widget, scope);

              //AW Persist title change from options editor
              scope.$emit('widgetChanged', widget);
            },
            function (reason) {
              
              // Call the dismiss callback
              onDismiss(reason, scope);

            }
          );

        };

        /**
         * Remove all widget instances from dashboard
         */
        scope.clear = function (doNotSave) {
          scope.widgets = [];
          if (doNotSave === true) {
            return;
          }
          scope.saveDashboard();
        };

        /**
         * Used for preventing default on click event
         * @param {Object} event     A click event
         * @param {Object} widgetDef A widget definition object
         */
        scope.addWidgetInternal = function (event, widgetDef) {
          event.preventDefault();
          scope.addWidget(widgetDef);
        };

        /**
         * Uses dashboardState service to save state
         */
        scope.saveDashboard = function (force) {
          if (!scope.options.explicitSave) {
            scope.dashboardState.save(scope.widgets);
          } else {
            if (!angular.isNumber(scope.options.unsavedChangeCount)) {
              scope.options.unsavedChangeCount = 0;
            }
            if (force) {
              scope.options.unsavedChangeCount = 0;
              scope.dashboardState.save(scope.widgets);

            } else {
              ++scope.options.unsavedChangeCount;
            }
          }
        };

        /**
         * Wraps saveDashboard for external use.
         */
        scope.externalSaveDashboard = function() {
          scope.saveDashboard(true);
        };

        /**
         * Clears current dash and instantiates widget definitions
         * @param  {Array} widgets Array of definition objects
         */
        scope.loadWidgets = function (widgets) {
          // AW dashboards are continuously saved today (no "save" button).
          //scope.defaultWidgets = widgets;
          scope.savedWidgetDefs = widgets;
          scope.clear(true);
          _.each(widgets, function (widgetDef) {
            scope.addWidget(widgetDef, true);
          });
        };

        /**
         * Resets widget instances to default config
         * @return {[type]} [description]
         */
        scope.resetWidgetsToDefault = function () {
          scope.loadWidgets(scope.defaultWidgets);
          scope.saveDashboard();
        };

        // Set default widgets array
        var savedWidgetDefs = scope.dashboardState.load();

        // Success handler
        function handleStateLoad(saved) {
          scope.options.unsavedChangeCount = 0;
          if (saved && saved.length) {
            scope.loadWidgets(saved);
          } else if (scope.defaultWidgets) {
            scope.loadWidgets(scope.defaultWidgets);
          } else {
            scope.clear(true);
          }
        }

        if (angular.isArray(savedWidgetDefs)) {
          handleStateLoad(savedWidgetDefs);
        } else if (savedWidgetDefs && angular.isObject(savedWidgetDefs) && angular.isFunction(savedWidgetDefs.then)) {
          savedWidgetDefs.then(handleStateLoad, handleStateLoad);
        } else {
          handleStateLoad();
        }

        // expose functionality externally
        // functions are appended to the provided dashboard options
        scope.options.addWidget = scope.addWidget;
        scope.options.loadWidgets = scope.loadWidgets;
        scope.options.saveDashboard = scope.externalSaveDashboard;
        scope.options.removeWidget = scope.removeWidget;
        scope.options.openWidgetSettings = scope.openWidgetSettings;

        // save state
        scope.$on('widgetChanged', function (event) {
          event.stopPropagation();
          scope.saveDashboard();
        });
      }
    };
  }]);
