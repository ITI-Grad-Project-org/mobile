import type { Field } from "../types";
import { CertsField } from "./fields/CertsField";
import { ChipsField } from "./fields/ChipsField";
import { DateField } from "./fields/DateField";
import { ImageField } from "./fields/ImageField";
import { ImagesField } from "./fields/ImagesField";
import { SelectField } from "./fields/SelectField";
import { TextField } from "./fields/TextField";

/** Dispatches a `Field` to the control that renders its `type`. */
export function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case "select":
      return <SelectField field={field} value={value} onChange={onChange} />;
    case "chips":
      return <ChipsField field={field} value={value} onChange={onChange} />;
    case "date":
      return <DateField field={field} value={value} onChange={onChange} />;
    case "image":
      return <ImageField field={field} value={value} onChange={onChange} />;
    case "images":
      return <ImagesField field={field} value={value} onChange={onChange} />;
    case "certs":
      return <CertsField field={field} value={value} onChange={onChange} />;
    default:
      // text | email | tel | number | url | textarea
      return <TextField field={field} value={value} onChange={onChange} />;
  }
}
