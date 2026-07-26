// Config-driven multi-step profile form. Ported from the web `SignupFlow`
// component to React Native. A screen supplies a list of `Step`s (each a list of
// `Field`s); `SignupFlow` renders them one page at a time and hands the collected
// values back through `onDone`.

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "date"
  | "number"
  | "select"
  | "textarea"
  | "chips"
  | "url"
  | "image"
  | "images"
  | "certs"
  | "hours";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  /** For `chips`: false = single-select. Defaults to multi-select. */
  multi?: boolean;
  /** Trailing unit shown inside numeric/text inputs (e.g. "cm", "kg"). */
  unit?: string;
  /** Grey hint under the control — units, formats, why we ask. */
  helper?: string;
  /** For `number`: allow a decimal point (weight) vs integers only (age). */
  decimal?: boolean;
  /** For `number`: clamped on blur so the API never sees an absurd value. */
  min?: number;
  max?: number;
  /** Caps the typed length (digits for `number`/`tel`, characters otherwise). */
  maxLength?: number;
};

export type Step = {
  title: string;
  subtitle?: string;
  fields: Field[];
};

/** A coach certificate captured in the `certs` field. */
export type Certificate = {
  id: string;
  image: string;
  name: string;
  issued: string;
  expires: string;
};

/** The bag of collected values, keyed by `Field.key`. */
export type ProfileData = Record<string, unknown>;
