import { Request, Response } from 'express';
import { InjectionToken } from '@angular/core';
import * as i0 from "@angular/core";
export declare const REQUEST: InjectionToken<Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>>;
export declare const RESPONSE: InjectionToken<Response<any, Record<string, any>>>;
export declare class SsrCookieService {
    private document;
    private platformId;
    private request;
    private response;
    private readonly documentIsAccessible;
    constructor(document: Document, platformId: any, request: Request, response: Response);
    /**
     * Get cookie Regular Expression
     *
     * @param name Cookie name
     * @returns property RegExp
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    static getCookieRegExp(name: string): RegExp;
    /**
     * Gets the unencoded version of an encoded component of a Uniform Resource Identifier (URI).
     *
     * @param encodedURIComponent A value representing an encoded URI component.
     *
     * @returns The unencoded version of an encoded component of a Uniform Resource Identifier (URI).
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    static safeDecodeURIComponent(encodedURIComponent: string): string;
    /**
     * Converts the provided cookie string to a key-value representation.
     *
     * @param cookieString - A concatenated string of cookies
     * @returns Map - Key-value pairs of the provided cookies
     *
     * @author: Blake Ballard (blakeoxx)
     * @since: 16.2.0
     * @see {@link https://github.com/stevermeister/ngx-cookie-service/blob/f7625d789dc18ea6aebcf136edb4cc01eeac5de9/projects/ngx-cookie-service-ssr/src/lib/ssr-cookie.service.ts#L100}
     *  for previous implementation of parsing logic
     */
    static cookieStringToMap(cookieString: string): Map<string, string>;
    /**
     * Gets the current state of all cookies based on the request and response. Cookies added or changed in the response
     * override any old values provided in the response.
     *
     * Client-side will always just return the document's cookies.
     *
     * @private
     * @returns Map - All cookies from the request and response (or document) in key-value form.
     *
     * @author: Blake Ballard (blakeoxx)
     * @since: 16.2.0
     * @see {@link https://github.com/stevermeister/ngx-cookie-service/blob/f7625d789dc18ea6aebcf136edb4cc01eeac5de9/projects/ngx-cookie-service-ssr/src/lib/ssr-cookie.service.ts#L100}
     *  for previous implementation of parsing logic
     */
    private getCombinedCookies;
    /**
     * Saves a cookie to the client-side document
     *
     * @param name
     * @param value
     * @param options
     * @private
     *
     * @author: Blake Ballard (blakeoxx)
     * @since: 16.2.0
     * @see {@link set} for the original client-side cookie setter logic. This logic is mostly straight from there
     */
    private setClientCookie;
    /**
     * Saves a cookie to the server-side response cookie headers
     *
     * @param name
     * @param value
     * @param options
     * @private
     *
     * @author: Blake Ballard (blakeoxx)
     * @since: 16.2.0
     */
    private setServerCookie;
    /**
     * Return `true` if {@link Document} is accessible, otherwise return `false`
     *
     * @param name Cookie name
     * @returns boolean - whether cookie with specified name exists
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    check(name: string): boolean;
    /**
     * Get cookies by name
     *
     * @param name Cookie name
     * @returns property value
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    get(name: string): string;
    /**
     * Get all cookies in JSON format
     *
     * @returns all the cookies in json
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    getAll(): {
        [key: string]: string;
    };
    /**
     * Set cookie based on provided information
     *
     * @param name     Cookie name
     * @param value    Cookie value
     * @param expires  Number of days until the cookies expires or an actual `Date`
     * @param path     Cookie path
     * @param domain   Cookie domain
     * @param secure   Secure flag
     * @param sameSite OWASP same site token `Lax`, `None`, or `Strict`. Defaults to `Lax`
     * @param partitioned Partitioned flag
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    set(name: string, value: string, expires?: number | Date, path?: string, domain?: string, secure?: boolean, sameSite?: 'Lax' | 'None' | 'Strict', partitioned?: boolean): void;
    /**
     * Set cookie based on provided information
     *
     * Cookie's parameters:
     * <pre>
     * expires  Number of days until the cookies expires or an actual `Date`
     * path     Cookie path
     * domain   Cookie domain
     * secure Cookie secure flag
     * sameSite OWASP same site token `Lax`, `None`, or `Strict`. Defaults to `Lax`
     * </pre>
     *
     * @param name     Cookie name
     * @param value    Cookie value
     * @param options  Body with cookie's params
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    set(name: string, value: string, options?: {
        expires?: number | Date;
        path?: string;
        domain?: string;
        secure?: boolean;
        sameSite?: 'Lax' | 'None' | 'Strict';
        partitioned?: boolean;
    }): void;
    /**
     * Delete cookie by name
     *
     * @param name   Cookie name
     * @param path   Cookie path
     * @param domain Cookie domain
     * @param secure Cookie secure flag
     * @param sameSite Cookie sameSite flag - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    delete(name: string, path?: string, domain?: string, secure?: boolean, sameSite?: 'Lax' | 'None' | 'Strict'): void;
    /**
     * Delete all cookies
     *
     * @param path   Cookie path
     * @param domain Cookie domain
     * @param secure Is the Cookie secure
     * @param sameSite Is the cookie same site
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    deleteAll(path?: string, domain?: string, secure?: boolean, sameSite?: 'Lax' | 'None' | 'Strict'): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<SsrCookieService, [null, null, { optional: true; }, { optional: true; }]>;
    static ɵprov: i0.ɵɵInjectableDeclaration<SsrCookieService>;
}
