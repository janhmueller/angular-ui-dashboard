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

angular.module('app')
  .controller('CustomSettingsDemoCtrl', function($scope, $interval, $window, widgetDefinitions, defaultWidgets, RandomDataModel) {

    // Add an additional widget with setting overrides
    var definitions = [{
      name: 'congfigurable widget',
      directive: 'wt-scope-watch',
      dataAttrName: 'value',
      dataModelType: RandomDataModel,
      dataModelOptions: {
        limit: 10
      },
      settingsModalOptions: {
        partialTemplateUrl: 'app/template/configurableWidgetModalOptions.html'
      },
      onSettingsClose: function (result, widget) {
        if (widget.dataModel && widget.dataModel.updateLimit) {
          widget.dataModel.updateLimit(result.dataModelOptions.limit);
        }
      }
    }, {
      name: 'override modal widget',
      directive: 'wt-scope-watch',
      dataAttrName: 'value',
      dataModelType: RandomDataModel,
      settingsModalOptions: {
        templateUrl: 'app/template/WidgetSpecificSettings.html',
        controller: 'WidgetSpecificSettingsCtrl',
        backdrop: false
      },
      onSettingsClose: function(result, widget) {
        console.log('Widget-specific settings resolved!');
        jQuery.extend(true, widget, result);
      },
      onSettingsDismiss: function(reason, scope) {
        console.log('Settings have been dismissed: ', reason);
        console.log('Dashboard scope: ', scope);
      }
    }];

    var defaultWidgets = [
      { name: 'congfigurable widget' },
      { name: 'override modal widget' }
    ];

    $scope.dashboardOptions = {
      widgetButtons: true,
      widgetDefinitions: definitions,
      defaultWidgets: defaultWidgets,
      storage: $window.localStorage,
      storageId: 'custom-settings',


      // Called when a widget settings dialog is closed
      // by the "ok" method (i.e., the promise is resolved
      // and not rejected). This can also be set on individual
      // widgets (see above).
      onSettingsClose: function(result, widget, scope) {
        console.log('Settings result: ', result);
        console.log('Widget: ', widget);
        console.log('Dashboard scope: ', scope);
        jQuery.extend(true, widget, result);
      },

      // Called when a widget settings dialog is closed
      // by the "cancel" method (i.e., the promise is rejected
      // and not resolved). This can also be set on individual
      // widgets (see above).
      onSettingsDismiss: function(reason, scope) {
        console.log('Settings have been dismissed: ', reason);
        console.log('Dashboard scope: ', scope);
      }
    };
  })
  .controller('WidgetSpecificSettingsCtrl', [ '$mdDialog', ($scope, $mdDialog, widget) {
    // add widget to scope
    $scope.widget = widget;

    // set up result object
    $scope.result = jQuery.extend(true, {}, widget);

    $scope.ok = function () {
      console.log('calling ok from widget-specific settings controller!');
      $mdDialog.hide($scope.result);
    };

    $scope.cancel = function () {
      console.log('calling cancel from widget-specific settings controller!');
      $mdDialog.cancel();
    };
  }]);
