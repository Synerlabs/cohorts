import { FormField } from './form-field';

export interface DragState {
  field: FormField;
  sourcePath: string[];
}

export function findFieldByPath(
  fields: FormField[],
  path: string[]
): { field: FormField; parent: FormField[] } | null {
  if (path.length === 0) return null;
  if (path.length === 1) {
    const index = parseInt(path[0]);
    return { field: fields[index], parent: fields };
  }

  const index = parseInt(path[0]);
  const field = fields[index];
  const remainingPath = path.slice(1);

  if (field.sectionConfig) {
    return findFieldByPath(field.sectionConfig.fields, remainingPath);
  }
  if (field.repeatableConfig) {
    return findFieldByPath(field.repeatableConfig.fields, remainingPath);
  }

  return null;
}

export function removeFieldByPath(fields: FormField[], path: string[]): FormField[] {
  if (path.length === 0) return fields;
  if (path.length === 1) {
    const index = parseInt(path[0]);
    return [...fields.slice(0, index), ...fields.slice(index + 1)];
  }

  const index = parseInt(path[0]);
  const field = fields[index];
  const remainingPath = path.slice(1);
  const newFields = [...fields];

  if (field.sectionConfig) {
    newFields[index] = {
      ...field,
      sectionConfig: {
        ...field.sectionConfig,
        fields: removeFieldByPath(field.sectionConfig.fields, remainingPath),
      },
    };
  } else if (field.repeatableConfig) {
    newFields[index] = {
      ...field,
      repeatableConfig: {
        ...field.repeatableConfig,
        fields: removeFieldByPath(field.repeatableConfig.fields, remainingPath),
      },
    };
  }

  return newFields;
}

export function insertFieldAtPath(
  fields: FormField[],
  path: string[],
  newField: FormField,
  position: 'before' | 'after' | 'inside' = 'after'
): FormField[] {
  if (path.length === 0) {
    return position === 'before' ? [newField, ...fields] : [...fields, newField];
  }

  const index = parseInt(path[0]);
  const field = fields[index];
  const newFields = [...fields];

  if (path.length === 1) {
    if (position === 'before') {
      return [...fields.slice(0, index), newField, ...fields.slice(index)];
    }
    if (position === 'after') {
      return [...fields.slice(0, index + 1), newField, ...fields.slice(index + 1)];
    }
    // position === 'inside'
    if (field.sectionConfig) {
      newFields[index] = {
        ...field,
        sectionConfig: {
          ...field.sectionConfig,
          fields: [newField, ...field.sectionConfig.fields],
        },
      };
    } else if (field.repeatableConfig) {
      newFields[index] = {
        ...field,
        repeatableConfig: {
          ...field.repeatableConfig,
          fields: [newField, ...field.repeatableConfig.fields],
        },
      };
    }
    return newFields;
  }

  const remainingPath = path.slice(1);

  if (field.sectionConfig) {
    newFields[index] = {
      ...field,
      sectionConfig: {
        ...field.sectionConfig,
        fields: insertFieldAtPath(
          field.sectionConfig.fields,
          remainingPath,
          newField,
          position
        ),
      },
    };
  } else if (field.repeatableConfig) {
    newFields[index] = {
      ...field,
      repeatableConfig: {
        ...field.repeatableConfig,
        fields: insertFieldAtPath(
          field.repeatableConfig.fields,
          remainingPath,
          newField,
          position
        ),
      },
    };
  }

  return newFields;
}

export function isValidDropTarget(
  sourceField: FormField,
  targetField: FormField,
  position: 'before' | 'after' | 'inside'
): boolean {
  // Don't allow dropping a field into itself or its children
  if (position === 'inside' && isFieldDescendant(targetField, sourceField)) {
    return false;
  }

  // Don't allow dropping a field next to itself
  if (position !== 'inside' && sourceField.id === targetField.id) {
    return false;
  }

  return true;
}

function isFieldDescendant(field: FormField, potentialAncestor: FormField): boolean {
  if (field.id === potentialAncestor.id) return true;

  const children = field.sectionConfig?.fields || field.repeatableConfig?.fields;
  if (!children) return false;

  return children.some((child) => isFieldDescendant(child, potentialAncestor));
}

export function getDropPosition(
  e: React.DragEvent,
  element: HTMLElement
): 'before' | 'after' | 'inside' {
  const rect = element.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const height = rect.height;

  if (y < height * 0.25) return 'before';
  if (y > height * 0.75) return 'after';
  return 'inside';
} 