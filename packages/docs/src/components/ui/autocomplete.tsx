import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';

/**
 * A text input with a list of suggestions, on Base UI's autocomplete — shadcn
 * has no component for it, so this follows the shape of the ones it does.
 *
 * Base UI owns the keys: focus stays in the input while the arrows move a
 * highlight through the list, and Enter activates the highlighted item.
 * Unstyled here; the search passes the classes style.css draws it with.
 */

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
