import TestContainer from 'mocha-test-container-support';

import {
  act
} from '@testing-library/preact';

import {
  bootstrapPropertiesPanel,
  inject
} from 'test/TestHelper';

import {
  query as domQuery,
  queryAll as domQueryAll
} from 'min-dom';

import {
  getBusinessObject
} from 'bpmn-js/lib/util/ModelUtil';

import {
  getProperties,
  getPropertiesList
} from 'src/provider/shared/ExtensionPropertiesProps';

import CoreModule from 'bpmn-js/lib/core';
import SelectionModule from 'diagram-js/lib/features/selection';
import ModelingModule from 'bpmn-js/lib/features/modeling';

import BpmnPropertiesPanel from 'src/render';

import CamundaPlatformPropertiesProvider from 'src/provider/camunda-platform';
import ZeebePropertiesProvider from 'src/provider/zeebe';

import camundaModdleExtension from 'camunda-bpmn-moddle/resources/camunda.json';
import zeebeModdleExtension from 'zeebe-bpmn-moddle/resources/zeebe.json';

import diagramCamundaXML from './ExtensionPropertiesProps.camunda.bpmn';
import diagramZeebeXML from './ExtensionPropertiesProps.zeebe.bpmn';


describe('provider/shared - ExtensionPropertiesProps', function() {

  let container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  const testModules = [
    BpmnPropertiesPanel,
    CoreModule,
    ModelingModule,
    SelectionModule
  ];

  function getDiagram(namespace = 'camunda') {
    if (namespace === 'zeebe') {
      return diagramZeebeXML;
    }

    return diagramCamundaXML;
  }

  function getOptions(namespace = 'camunda') {
    if (namespace === 'zeebe') {
      return {
        modules: [ ...testModules, ZeebePropertiesProvider ],
        moddleExtensions: { zeebe: zeebeModdleExtension }
      };
    }

    return {
      modules: [ ...testModules, CamundaPlatformPropertiesProvider ],
      moddleExtensions: { camunda: camundaModdleExtension }
    };
  }

  function getPrefix(namespace = 'camunda') {
    if (namespace === 'zeebe') {
      return 'Zeebe';
    }

    return 'CamundaPlatform';
  }


  [ 'camunda', 'zeebe' ].forEach((namespace) => {

    describe(namespace, function() {

      beforeEach(bootstrapPropertiesPanel(getDiagram(namespace), {
        debounceInput: false,
        ...getOptions(namespace)
      }));


      describe('bpmn:ServiceTask#properties', function() {

        it('should display', inject(async function(elementRegistry, selection) {

          // given
          const serviceTask = elementRegistry.get('ServiceTask_1');

          await act(() => {
            selection.select(serviceTask);
          });

          // when
          const group = getGroup(container, `${ getPrefix(namespace) }__ExtensionProperties`);
          const listItems = getPropertiesListItems(group);

          // then
          expect(group).to.exist;
          expect(listItems.length).to.equal(getPropertiesList(serviceTask, namespace).length);
        }));


        it('should add new property', inject(async function(elementRegistry, selection) {

          // given
          const serviceTask = elementRegistry.get('ServiceTask_1');

          await act(() => {
            selection.select(serviceTask);
          });

          const group = getGroup(container, `${ getPrefix(namespace) }__ExtensionProperties`);
          const addEntry = domQuery('.bio-properties-panel-add-entry', group);

          // when
          await act(() => {
            addEntry.click();
          });

          // then
          expect(getPropertiesList(serviceTask, namespace)).to.have.length(4);
        }));


        it('should create non existing extension elements', inject(
          async function(elementRegistry, selection) {

            // given
            const serviceTask = elementRegistry.get('ServiceTask_empty');

            await act(() => {
              selection.select(serviceTask);
            });

            // assume
            expect(getBusinessObject(serviceTask).get('extensionElements')).not.to.exist;

            const group = getGroup(container, `${ getPrefix(namespace) }__ExtensionProperties`);
            const addEntry = domQuery('.bio-properties-panel-add-entry', group);

            // when
            await act(() => {
              addEntry.click();
            });

            // then
            expect(getBusinessObject(serviceTask).get('extensionElements')).to.exist;
          }
        ));


        it('should create non existing camunda:Properties', inject(
          async function(elementRegistry, selection) {

            // given
            const serviceTask = elementRegistry.get('ServiceTask_noProperties');

            await act(() => {
              selection.select(serviceTask);
            });

            // assume
            expect(getProperties(serviceTask, namespace)).not.to.exist;

            const group = getGroup(container, `${ getPrefix(namespace) }__ExtensionProperties`);
            const addEntry = domQuery('.bio-properties-panel-add-entry', group);

            // when
            await act(() => {
              addEntry.click();
            });

            // then
            expect(getProperties(serviceTask, namespace)).to.exist;
          }
        ));


        it('should delete property', inject(async function(elementRegistry, selection) {

          // given
          const serviceTask = elementRegistry.get('ServiceTask_1');

          await act(() => {
            selection.select(serviceTask);
          });

          const group = getGroup(container, `${ getPrefix(namespace) }__ExtensionProperties`);
          const listItems = getPropertiesListItems(group);
          const removeEntry = domQuery('.bio-properties-panel-remove-entry', listItems[ 0 ]);

          // when
          await act(() => {
            removeEntry.click();
          });

          // then
          expect(getPropertiesList(serviceTask, namespace)).to.have.length(2);
        }));


        it('should remove camunda:Properties on last delete', inject(
          async function(elementRegistry, selection) {

            // given
            const serviceTask = elementRegistry.get('ServiceTask_2');

            await act(() => {
              selection.select(serviceTask);
            });

            // assume
            expect(getProperties(serviceTask, namespace)).to.exist;

            const group = getGroup(container, `${ getPrefix(namespace) }__ExtensionProperties`);
            const listItems = getPropertiesListItems(group, namespace);
            const removeEntry = domQuery('.bio-properties-panel-remove-entry', listItems[ 0 ]);

            // when
            await act(() => {
              removeEntry.click();
            });

            // then
            expect(getProperties(serviceTask, namespace)).not.to.exist;
          })
        );


        it('should update on external change', inject(
          async function(elementRegistry, selection, commandStack) {

            // given
            const serviceTask = elementRegistry.get('ServiceTask_1');
            const originalProperties = getPropertiesList(serviceTask, namespace);

            await act(() => {
              selection.select(serviceTask);
            });

            const addEntry = domQuery('.bio-properties-panel-add-entry', container);
            await act(() => {
              addEntry.click();
            });

            // when
            await act(() => {
              commandStack.undo();
            });

            const group = getGroup(container, `${ getPrefix(namespace) }__ExtensionProperties`);
            const listItems = getPropertiesListItems(group, namespace);

            // then
            expect(listItems.length).to.eql(originalProperties.length);
          }
        ));

      });

    });

  });

});


// helper //////////////////

function getGroup(container, id) {
  return domQuery(`[data-group-id="group-${id}"`, container);
}

function getListItems(container, type) {
  return domQueryAll(`div[data-entry-id*="-${type}-"].bio-properties-panel-collapsible-entry`, container);
}

function getPropertiesListItems(container) {
  return getListItems(container, 'extensionProperty');
}