import {
  getBusinessObject
} from 'bpmn-js/lib/util/ModelUtil';

import { find } from 'min-dash';

import validate from '../util/validate';

import PropertyBindingProvider from './PropertyBindingProvider';
import TaskDefinitionTypeBindingProvider from './TaskDefinitionTypeBindingProvider';
import InputBindingProvider from './InputBindingProvider';
import OutputBindingProvider from './OutputBindingProvider';
import TaskHeaderBindingProvider from './TaskHeaderBindingProvider';
import ZeebePropertiesProvider from './ZeebePropertiesProvider';
import { CallActivityProcessIdBindingProvider } from './CallActivityBindingProvider';

import {
  EXTENSION_BINDING_TYPES,
  PROPERTY_TYPE,
  ZEEBE_TASK_DEFINITION_TYPE_TYPE,
  ZEBBE_INPUT_TYPE,
  ZEEBE_OUTPUT_TYPE,
  ZEEBE_TASK_HEADER_TYPE,
  ZEBBE_PROPERTY_TYPE,
  ZEEBE_ACTIVITY_CALLED_ELEMENT_PROCESS_ID_TYPE,
} from '../util/bindingTypes';

import { applyConditions } from '../Condition';

export default class TemplateElementFactory {

  constructor(bpmnFactory, elementFactory, moddle) {
    this._bpmnFactory = bpmnFactory;
    this._elementFactory = elementFactory;
    this._moddle = moddle;

    this._providers = {
      [PROPERTY_TYPE]: PropertyBindingProvider,
      [ZEEBE_TASK_DEFINITION_TYPE_TYPE]: TaskDefinitionTypeBindingProvider,
      [ZEBBE_PROPERTY_TYPE]: ZeebePropertiesProvider,
      [ZEBBE_INPUT_TYPE]: InputBindingProvider,
      [ZEEBE_OUTPUT_TYPE]: OutputBindingProvider,
      [ZEEBE_TASK_HEADER_TYPE]: TaskHeaderBindingProvider,
      [ZEEBE_ACTIVITY_CALLED_ELEMENT_PROCESS_ID_TYPE]: CallActivityProcessIdBindingProvider,
    };
  }

  /**
   * Create an element based on an element template.
   *
   * @param {ElementTemplate} template
   * @returns {djs.model.Base}
   */
  create(template) {

    const {
      appliesTo,
      elementType
    } = template;

    const elementFactory = this._elementFactory;
    const bpmnFactory = this._bpmnFactory;
    const moddle = this._moddle;
    const providers = this._providers;

    // (0) make sure template is valid
    const errors = validate([ template ], moddle);

    // todo(pinussilvestrus): return validation errors
    if (errors && errors.length) {
      throw new Error('template is invalid');
    }

    const type = (elementType && elementType.value) || appliesTo[0];

    // (1) create element from appliesTo
    const element = elementFactory.createShape({ type });

    // (2) ensure extension elements
    if (hasExtensionBindings(template)) {
      this._ensureExtensionElements(element);
    }

    // (3) apply template
    this._setModelerTemplate(element, template);

    // (4) apply icon
    if (hasIcon(template)) {
      this._setModelerTemplateIcon(element, template);
    }

    const { properties } = applyConditions(element, template);

    // (5) apply properties
    properties.forEach(function(property) {

      const {
        binding
      } = property;

      const {
        type: bindingType
      } = binding;

      const bindingProvider = providers[bindingType];

      bindingProvider.create(element, {
        property,
        bpmnFactory
      });
    });

    return element;
  }

  _ensureExtensionElements(element) {
    const bpmnFactory = this._bpmnFactory;
    const businessObject = getBusinessObject(element);

    let extensionElements = businessObject.get('extensionElements');

    if (!extensionElements) {
      extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
        values: []
      });

      extensionElements.$parent = businessObject;
      businessObject.set('extensionElements', extensionElements);
    }

    return extensionElements;
  }

  _setModelerTemplate(element, template) {
    const {
      id,
      version
    } = template;

    const businessObject = getBusinessObject(element);

    businessObject.set('zeebe:modelerTemplate', id);
    businessObject.set('zeebe:modelerTemplateVersion', version);
  }

  _setModelerTemplateIcon(element, template) {
    const {
      icon
    } = template;

    const {
      contents
    } = icon;

    const businessObject = getBusinessObject(element);

    businessObject.set('zeebe:modelerTemplateIcon', contents);
  }
}

TemplateElementFactory.$inject = [ 'bpmnFactory', 'elementFactory', 'moddle' ];


// helper ////////////////

function hasExtensionBindings(template) {
  const {
    properties
  } = template;

  // find icon first
  if (hasIcon(template)) {
    return true;
  }

  return find(properties, function(property) {
    const {
      binding
    } = property;

    return EXTENSION_BINDING_TYPES.includes(binding.type);
  });
}

function hasIcon(template) {
  const {
    icon
  } = template;

  return !!(icon && icon.contents);
}
