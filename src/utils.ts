import {Store} from "redux";
import * as actions from "./actions";

export function doCorked(store: Store<any>, func: () => void) {
    try {
        store.dispatch(actions.cork())
        func()
    } finally {
        store.dispatch(actions.uncork())
    }
}

export function pad(pad: string, string: string) {
    if (string.length > pad.length) {
        string = string.substring(0, pad.length)
    }
    return (pad + string).slice(-pad.length)
}
