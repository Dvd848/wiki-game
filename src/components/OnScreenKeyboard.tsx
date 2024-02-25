import Keyboard from 'react-simple-keyboard';

/*
function isTouchDevice() {
    return (('ontouchstart' in window) ||
    ((navigator.maxTouchPoints & 0xFF) > 0));
}
*/

const OnScreenKeyboard = ({keyboardRef}: {keyboardRef: React.RefObject<HTMLDivElement>}) => {
    const layout = {
        default: [
            "\u05e7 \u05e8 \u05d0 \u05d8 \u05d5 \u05df \u05dd \u05e4",
            "\u05e9 \u05d3 \u05d2 \u05db \u05e2 \u05d9 \u05d7 \u05dc \u05da \u05e3",
            "\u05d6 \u05e1 \u05d1 \u05d4 \u05e0 \u05de \u05e6 \u05ea \u05e5",
            "{bksp} {enter}"
        ]
    }

    const display={
        '{bksp}': '⌫',
        '{enter}': '&nbsp;&nbsp;&nbsp;↵&nbsp;&nbsp;&nbsp;',
    }

    const onKeyPress = (button: string) => {
        if (button === '{enter}') {
            window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
        }
        else if (button === '{bksp}') {
            window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Backspace' }));
        }
        else {
            window.dispatchEvent(new KeyboardEvent('keyup', { key: button }));
        }
    };

    
    //if (isTouchDevice()) {
        return (
            <>
                {/*<div id="keyboard_filler"></div>*/}
                <div className="offcanvas offcanvas-bottom h-auto" id="onScreenKeyboardOffcanvas" aria-labelledby="onScreenKeyboardOffcanvasLabel" 
                        data-bs-keyboard="false" data-bs-backdrop="false" data-bs-scroll="true" ref={keyboardRef}>
                    <div className="offcanvas-header" dir="ltr">
                    <button type="button" className="btn-close" data-bs-dismiss="offcanvas" 
                            aria-label="Close" data-bs-target="#onScreenKeyboardOffcanvas"></button>
                    </div>
                    <div className="offcanvas-body p-0" style={{overflowY: "hidden"}}>
                        <div dir="ltr">
                            <Keyboard layout={layout} display={display} onKeyPress={onKeyPress}/>
                        </div>
                    </div>
                </div>
            </>
        );
    //} 
    //else {
    //    return "";
    //}

}

export default OnScreenKeyboard;