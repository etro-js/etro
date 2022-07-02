/**
 * @module event
 */
import EtroObject from './object';
export interface Event {
    target: EtroObject;
    type: string;
}
/**
 * Listen for an event or category of events
 *
 * @param target - a etro object
 * @param type - the id of the type (can contain subtypes, such as
 * "type.subtype")
 * @param listener
 */
export declare function subscribe(target: EtroObject, type: string, listener: <T extends Event>(T: any) => void): void;
/**
 * Remove an event listener
 *
 * @param target - a etro object
 * @param type - the id of the type (can contain subtypes, such as
 * "type.subtype")
 * @param listener
 */
export declare function unsubscribe(target: EtroObject, listener: <T extends Event>(T: any) => void): void;
/**
 * Emits an event to all listeners
 *
 * @param target - a etro object
 * @param type - the id of the type (can contain subtypes, such as
 * "type.subtype")
 * @param event - any additional event data
 */
export declare function publish(target: EtroObject, type: string, event: Record<string, unknown>): Event;
