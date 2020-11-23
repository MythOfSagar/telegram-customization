import { MOUNT_CLASS_TO } from "../lib/mtproto/mtproto_config";
import { isTouchSupported } from "./touchSupport";

/* export function isInDOM(element: Element, parentNode?: HTMLElement): boolean {
  if(!element) {
    return false;
  }

  parentNode = parentNode || document.body;
  if(element == parentNode) {
    return true;
  }
  return isInDOM(element.parentNode as HTMLElement, parentNode);
} */
export function isInDOM(element: Element): boolean {
  return element?.isConnected;
}

/* export function checkDragEvent(e: any) {
  if(!e || e.target && (e.target.tagName == 'IMG' || e.target.tagName == 'A')) return false
  if(e.dataTransfer && e.dataTransfer.types) {
    for(var i = 0; i < e.dataTransfer.types.length; i++) {
      if(e.dataTransfer.types[i] == 'Files') {
        return true;
      }
    }
  } else {
    return true;
  }

  return false;
} */

export function cancelEvent(event: Event) {
  event = event || window.event;
  if(event) {
    // @ts-ignore
    event = event.originalEvent || event;

    try {
      if(event.stopPropagation) event.stopPropagation();
      if(event.preventDefault) event.preventDefault();
      event.returnValue = false;
      event.cancelBubble = true;
    } catch(err) {}
  }

  return false;
}

export function placeCaretAtEnd(el: HTMLElement) {
  el.focus();
  if(typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
    var range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    // @ts-ignore
  } else if(typeof document.body.createTextRange != "undefined") {
    // @ts-ignore
    var textRange = document.body.createTextRange();
    textRange.moveToElementText(el);
    textRange.collapse(false);
    textRange.select();
  }
}

/* export function getFieldSelection(field: any) {
  if(field.selectionStart) {
    return field.selectionStart;
  // @ts-ignore
  } else if(!document.selection) {
    return 0;
  }

  const c = '\x01';
  // @ts-ignore
  const sel = document.selection.createRange();
  const txt = sel.text;
  const dup = sel.duplicate();
  let len = 0;

  try {
    dup.moveToElementText(field);
  } catch(e) {
    return 0;
  }

  sel.text = txt + c;
  len = dup.text.indexOf(c);
  sel.moveStart('character', -1);
  sel.text = '';

  // if (browser.msie && len == -1) {
  //   return field.value.length
  // }
  return len;
} */

export function getRichValue(field: HTMLElement) {
  if(!field) {
    return '';
  }

  const lines: string[] = [];
  const line: string[] = [];

  getRichElementValue(field, lines, line);
  if(line.length) {
    lines.push(line.join(''));
  }

  let value = lines.join('\n');
  value = value.replace(/\u00A0/g, ' ');

  return value;
}

MOUNT_CLASS_TO && (MOUNT_CLASS_TO.getRichValue = getRichValue);

const markdownTags = [{
  tagName: 'STRONG', 
  markdown: '**'
}, {
  tagName: 'B',   // * legacy (Ctrl+B)
  markdown: '**'
}, {
  tagName: 'U',   // * legacy (Ctrl+I)
  markdown: '_-_'
}, {
  tagName: 'I',   // * legacy (Ctrl+I)
  markdown: '__'
}, {
  tagName: 'EM',
  markdown: '__'
}, {
  tagName: 'CODE',
  markdown: '`'
}, {
  tagName: 'PRE',
  markdown: '``'
}, {
  tagName: 'DEL',
  markdown: '~~'
}, {
  tagName: 'A',
  markdown: (node: HTMLElement) => `[${(node.parentElement as HTMLAnchorElement).href}](${node.nodeValue})`
}];
export function getRichElementValue(node: HTMLElement, lines: string[], line: string[], selNode?: Node, selOffset?: number) {
  if(node.nodeType == 3) { // TEXT
    if(selNode === node) {
      const value = node.nodeValue;
      line.push(value.substr(0, selOffset) + '\x01' + value.substr(selOffset));
    } else {
      let markdown: string;
      if(node.parentNode) {
        const tagName = node.parentElement.tagName;
        const markdownTag = markdownTags.find(m => m.tagName == tagName);
        if(markdownTag) {
          if(typeof(markdownTag.markdown) === 'function') {
            line.push(markdownTag.markdown(node));
            return;
          }

          markdown = markdownTag.markdown;
        }
      }

      line.push(markdown && node.nodeValue.trim() ? '\x01' + markdown + node.nodeValue + markdown + '\x01' : node.nodeValue);
    }

    return;
  }

  if(node.nodeType != 1) { // NON-ELEMENT
    return;
  }

  const isSelected = (selNode === node);
  const isBlock = node.tagName == 'DIV' || node.tagName == 'P';
  if(isBlock && line.length || node.tagName == 'BR') {
    lines.push(line.join(''));
    line.splice(0, line.length);
  } else if(node.tagName == 'IMG') {
    if((node as HTMLImageElement).alt) {
      line.push((node as HTMLImageElement).alt);
    }
  }

  if(isSelected && !selOffset) {
    line.push('\x01');
  }

  let curChild = node.firstChild as HTMLElement;
  while(curChild) {
    getRichElementValue(curChild, lines, line, selNode, selOffset);
    curChild = curChild.nextSibling as any;
  }

  if(isSelected && selOffset) {
    line.push('\x01');
  }

  if(isBlock && line.length) {
    lines.push(line.join(''));
    line.splice(0, line.length);
  }
}

export function isInputEmpty(element: HTMLElement) {
  if(element.hasAttribute('contenteditable') || element.tagName != 'INPUT') {
    const value = element.innerText;

    return !value.trim() && !serializeNodes(Array.from(element.childNodes)).trim();
  } else {
    return !(element as HTMLInputElement).value.trim().length;
  }
}

export function serializeNodes(nodes: Node[]): string {
  return nodes.reduce((str, child: any) => {
    //console.log('childNode', str, child, typeof(child), typeof(child) === 'string', child.innerText);

    if(typeof(child) === 'object' && child.textContent) return str += child.textContent;
    if(child.innerText) return str += child.innerText;
    if(child.tagName == 'IMG' && child.classList && child.classList.contains('emoji')) return str += child.getAttribute('alt');

    return str;
  }, '');
}

/* if (Config.Modes.animations &&
  typeof window.requestAnimationFrame == 'function') {
  window.onAnimationFrameCallback = function (cb) {
    return (function () {
      window.requestAnimationFrame(cb)
    })
  }
} else {
  window.onAnimationFrameCallback = function (cb) {
    return cb
  }
} */

// generate a path's arc data parameter
// http://www.w3.org/TR/SVG/paths.html#PathDataEllipticalArcCommands
var arcParameter = function(rx: number, ry: number, xAxisRotation: number, largeArcFlag: number, sweepFlag: number, x: number, y: number) {
  return [rx, ',', ry, ' ',
          xAxisRotation, ' ',
          largeArcFlag, ',',
          sweepFlag, ' ',
          x, ',', y ].join('');
};

export function generatePathData(x: number, y: number, width: number, height: number, tl: number, tr: number, br: number, bl: number) {
  const data: string[] = [];

  // start point in top-middle of the rectangle
  data.push('M' + (x + width / 2) + ',' + y);

  // next we go to the right
  data.push('H' + (x + width - tr));

  if(tr > 0) {
    // now we draw the arc in the top-right corner
    data.push('A' + arcParameter(tr, tr, 0, 0, 1, (x + width), (y + tr)));
  }

  // next we go down
  data.push('V' + (y + height - br));

  if(br > 0) {
    // now we draw the arc in the lower-right corner
    data.push('A' + arcParameter(br, br, 0, 0, 1, (x + width - br), (y + height)));
  }

  // now we go to the left
  data.push('H' + (x + bl));

  if(bl > 0) {
    // now we draw the arc in the lower-left corner
    data.push('A' + arcParameter(bl, bl, 0, 0, 1, (x + 0), (y + height - bl)));
  }

  // next we go up
  data.push('V' + (y + tl));

  if(tl > 0) {
    // now we draw the arc in the top-left corner
    data.push('A' + arcParameter(tl, tl, 0, 0, 1, (x + tl), (y + 0)));
  }

  // and we close the path
  data.push('Z');

  return data.join(' ');
};

//export function findUpClassName<T>(el: any, className: string): T;
export function findUpClassName(el: any, className: string): HTMLElement {
  return el.closest('.' + className);
  /* if(el.classList.contains(className)) return el; // 03.02.2020

  while(el.parentElement) {
    el = el.parentElement;
    if(el.classList.contains(className)) 
      return el;
  }
  return null; */
}

export function findUpTag(el: any, tag: string): HTMLElement {
  return el.closest(tag);
  /* if(el.tagName == tag) return el; // 03.02.2020

  while(el.parentElement) {
    el = el.parentElement;
    if(el.tagName === tag) 
      return el;
  }
  return null; */
}

export function findUpAttribute(el: any, attribute: string): HTMLElement {
  return el.closest(`[${attribute}]`);
  /* if(el.getAttribute(attribute) != null) return el; // 03.02.2020

  while(el.parentElement) {
    el = el.parentElement;
    if(el.getAttribute(attribute) != null) 
      return el;
  }
  return null; */
}

export function whichChild(elem: Node) {
  if(!elem.parentNode) {
    return -1;
  }
  
  let i = 0;
  // @ts-ignore
  while((elem = elem.previousElementSibling) != null) ++i;
  return i;
};

export function fillPropertyValue(str: string) {
  let splitted = str.split(' ');
  if(splitted.length != 4) {
    if(!splitted[0]) splitted[0] = '0px';
    for(let i = splitted.length; i < 4; ++i) {
      splitted[i] = splitted[i % 2] || splitted[0] || '0px';
    }
  }

  return splitted;
}

export function calcImageInBox(imageW: number, imageH: number, boxW: number, boxH: number, noZoom?: boolean) {
  if(imageW < boxW && imageH < boxH) {
    return {w: imageW, h: imageH};
  }

  var boxedImageW = boxW;
  var boxedImageH = boxH;

  if((imageW / imageH) > (boxW / boxH)) {
    boxedImageH = (imageH * boxW / imageW) | 0;
  } else {
    boxedImageW = (imageW * boxH / imageH) | 0;
    if(boxedImageW > boxW) {
      boxedImageH = (boxedImageH * boxW / boxedImageW) | 0;
      boxedImageW = boxW;
    }
  }

  // if (Config.Navigator.retina) {
  //   imageW = Math.floor(imageW / 2)
  //   imageH = Math.floor(imageH / 2)
  // }

  if(noZoom && boxedImageW >= imageW && boxedImageH >= imageH) {
    boxedImageW = imageW;
    boxedImageH = imageH;
  }

  return {w: boxedImageW, h: boxedImageH};
}

export function positionElementByIndex(element: HTMLElement, container: HTMLElement, pos: number) {
  const prevPos = whichChild(element);

  if(prevPos == pos) {
    return false;
  } else if(prevPos != -1 && prevPos < pos) { // was higher
    pos += 1;
  }

  if(container.childElementCount > pos) {
    container.insertBefore(element, container.children[pos]);
  } else {
    container.append(element);
  }

  return true;
}

export function cancelSelection() {
  if(window.getSelection) {
    if(window.getSelection().empty) {  // Chrome
      window.getSelection().empty();
    } else if(window.getSelection().removeAllRanges) {  // Firefox
      window.getSelection().removeAllRanges();
    }
    // @ts-ignore
  } else if(document.selection) {  // IE?
    // @ts-ignore
    document.selection.empty();
  }
}

//(window as any).splitStringByLength = splitStringByLength;

export function getSelectedText(): string {
  if(window.getSelection) {
    return window.getSelection().toString();
    // @ts-ignore
  } else if(document.selection) {
    // @ts-ignore
    return document.selection.createRange().text;
  }
  
  return '';
}

export function blurActiveElement() {
  if(document.activeElement && (document.activeElement as HTMLInputElement).blur) {
    (document.activeElement as HTMLInputElement).blur();
  }
}

export const CLICK_EVENT_NAME = isTouchSupported ? 'touchend' : 'click';