import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';

// shadcn has none, so this follows the shape of the ones it has.

/** Context only — it renders no element, so there is nothing to mark. */
const Autocomplete = AutocompletePrimitive.Root;

function AutocompleteInput(props: AutocompletePrimitive.Input.Props) {
  return (
    <AutocompletePrimitive.Input data-slot="autocomplete-input" {...props} />
  );
}

function AutocompleteList(props: AutocompletePrimitive.List.Props) {
  return (
    <AutocompletePrimitive.List data-slot="autocomplete-list" {...props} />
  );
}

function AutocompleteItem(props: AutocompletePrimitive.Item.Props) {
  return (
    <AutocompletePrimitive.Item data-slot="autocomplete-item" {...props} />
  );
}

function AutocompleteStatus(props: AutocompletePrimitive.Status.Props) {
  return (
    <AutocompletePrimitive.Status data-slot="autocomplete-status" {...props} />
  );
}

export {
  Autocomplete,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteStatus,
};
