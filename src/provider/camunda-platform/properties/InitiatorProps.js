import {
  getBusinessObject,
  is
} from 'bpmn-js/lib/util/ModelUtil';

import TextField, { isEdited } from '@bpmn-io/properties-panel/lib/components/entries/TextField';

import {
  useService
} from '../../../hooks';


export function InitiatorProps(props) {
  const {
    element
  } = props;

  if (!isInitiator(element)) {
    return [];
  }

  return [
    {
      id: 'initiator',
      component: <Initiator element={ element } />,
      isEdited
    },
  ];
}

function Initiator(props) {
  const { element } = props;

  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const businessObject = getBusinessObject(element);

  const getValue = () => {
    return businessObject.get('camunda:initiator');
  };

  const setValue = (value) => {
    commandStack.execute('properties-panel.update-businessobject', {
      element: element,
      businessObject: businessObject,
      properties: {
        'camunda:initiator': value
      }
    });
  };

  return TextField({
    element,
    id: 'initiator',
    label: translate('Initiator'),
    getValue,
    setValue,
    debounce
  });
}


// helper ///////////////////

function isInitiator(element) {
  return is(element, 'camunda:Initiator') && !is(element.parent, 'bpmn:SubProcess');
}