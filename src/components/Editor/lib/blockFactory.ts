import type { TextBoxBlock, RectangleBlock, EllipseBlock, ShapeStyleConfig } from '@/types/album';
import { plainToRichText } from './slideFactory';
import { SHAPE } from '../../../../config/defaults';

import { nanoid } from 'nanoid';

function uid() {
  return nanoid();
}

const DEFAULT_SHAPE: ShapeStyleConfig = {
  fillColor: SHAPE.fillColor,
  fillOpacity: SHAPE.fillOpacity,
  strokeColor: SHAPE.strokeColor,
  strokeWidth: SHAPE.strokeWidth,
  strokeOpacity: SHAPE.strokeOpacity,
  borderRadius: 0,
};

export function makeTextBox(): TextBoxBlock {
  return {
    id: uid(),
    type: 'text_box',
    label: 'مربع نص',
    position: { x: 0.15, y: 0.4, width: 0.7, height: 0.15 },
    zIndex: 20,
    visible: true,
    typographyTokenRef: 'body-m',
    kashidaEnabled: true,
    content: plainToRichText('نص جديد'),
  };
}

export function makeRectangle(): RectangleBlock {
  return {
    id: uid(),
    type: 'rectangle',
    label: 'مستطيل',
    position: { x: 0.2, y: 0.35, width: 0.6, height: 0.2 },
    zIndex: 15,
    visible: true,
    shape: { ...DEFAULT_SHAPE, borderRadius: SHAPE.borderRadius },
  };
}

export function makeEllipse(): EllipseBlock {
  return {
    id: uid(),
    type: 'ellipse',
    label: 'دائرة',
    position: { x: 0.3, y: 0.35, width: 0.4, height: 0.25 },
    zIndex: 15,
    visible: true,
    shape: { ...DEFAULT_SHAPE },
  };
}
