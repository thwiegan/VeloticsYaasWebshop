/**
 * [y] hybris Platform
 *
 * Copyright (c) 2000-2015 hybris AG
 * All rights reserved.
 *
 * This software is the confidential and proprietary information of hybris
 * ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the
 * license agreement you entered into with hybris.
 */

'use strict';

/**  Initializes and configures the application. */
window.app = angular.module('ds.app', [
    'restangular',
    'ui.router',
    'ds.shared',
    'ds.security',
    'ds.i18n',
    'ds.home',
    'ds.products',
    'ds.cart',
    'ds.checkout',
    'ds.confirmation',
    'ds.coupon',
    'ds.account',
    'ds.addresses',
    'ds.auth',
    'ds.orders',
    'ds.queue',
    'ds.router',
    'ds.httpproxy',
    'ds.errors',
    'ds.backendMock',
    'xeditable',
    'ipCookie',
    'ngSanitize',
    'ui.select',
    'ui-notification',
    'ds.ybreadcrumb',
    'ds.ytracking',
    'ds.localstorage',
    'ds.appconfig',
    'ds.searchlist',
    'ds.ysearch'
])
    .constant('_', window._)

    // Configure HTTP and Restangular Providers - default headers, CORS
    .config(['$httpProvider', 'RestangularProvider', 'settings', 'appConfig',
        function ($httpProvider, RestangularProvider, settings, appConfig) {
        $httpProvider.interceptors.push('interceptor');

        // enable CORS
        $httpProvider.defaults.useXDomain = true;
        RestangularProvider.addFullRequestInterceptor( function(element, operation, route, url, headers, params, httpConfig) {

            var oldHeaders = {};
            if(url.indexOf('yaas') < 0) {
                delete $httpProvider.defaults.headers.common[settings.headers.hybrisAuthorization];
                //work around if not going through Apigee proxy for a particular URL, such as while testing new services
                oldHeaders [settings.headers.hybrisTenant] = appConfig.storeTenant();
                oldHeaders [settings.headers.hybrisRoles] = settings.roleSeller;
                oldHeaders [settings.headers.hybrisUser] = settings.hybrisUser;
                oldHeaders [settings.headers.hybrisApp] = settings.hybrisApp;
            }
            return {
                element: element,
                params: params,
                headers: _.extend(headers, oldHeaders),
                httpConfig: httpConfig
            };
        });
    }])

    .run(['$rootScope', '$injector','ConfigSvc', 'AuthDialogManager', '$location', 'settings', 'TokenSvc',
       'AuthSvc', 'GlobalData', '$state', 'httpQueue', 'editableOptions', 'editableThemes', 'CartSvc', 'EventSvc', 'ipCookie', '$window', 'AccountSvc', '$q',
        function ($rootScope, $injector, ConfigSvc, AuthDialogManager, $location, settings, TokenSvc,
                 AuthSvc, GlobalData, $state, httpQueue, editableOptions, editableThemes, CartSvc, EventSvc, ipCookie, $window, AccountSvc, $q) {
    	
			var hcpuserEmail = '';
			var hcpuserPassword = 'L7k9M7fmhk6883P93BK6';
			
	    	// I added this for the Velotics Demo Store to prefill the Form
	    	jQuery.ajaxSetup({async:false}); // Bad
	    	$.ajax({ 
	    	    type: 'GET', 
	    	    url: 'https://veloticswebshopa6402f209.hana.ondemand.com/api/authenticated/user?autocreate=true', 
	    	    dataType: 'json',
	    	    success: function (data) { 
	            	hcpuserEmail = data.hcpuser.email;
	    	    }
	    	});


            function showCart() {
                if ( ipCookie("showCart") != undefined ) {
                    $rootScope.showCart = ipCookie("showCart");
                } else {
                    $rootScope.showCart = false;
                } 
            }

            if (ipCookie('goto_anon_cart')) {
                // CartSvc.refreshCart(ipCookie('goto_anon_cart')).then(showCart, function() {
                //     $state.go($state.current.name, {}, {reload: true});
                // });
                var cart = {
                    id: ipCookie('goto_anon_cart')
                };
                ipCookie.remove('goto_anon_cart');

                CartSvc.setCart( cart );
            } else {  
                // showCart();
            }

            
	    	jQuery.ajaxSetup({async:true}); // Really bad
	    	
	    	AuthSvc.signin({
	                    "email": hcpuserEmail,
	                    "password": hcpuserPassword
            }).then(function() {
                /*function gotoLocation() {
                    var goto = $ipCookie('goto');
                    var params = $ipCookie('goto_params');

                    // $ipCookie.remove('goto');
                    // $ipCookie.remove('goto_params');
                    $state.go(goto.name, params, {reload: true});
                }

                if ($ipCookie('goto')) {
                    var anon_cart = $ipCookie('goto_anon_cart');
                    
                    if (anon_cart) {
                        $ipCookie.remove('goto_anon_cart');
                        CartSvc.refreshCart(anon_cart)
                            // .then(AccountSvc.getCurrentAccount)
                            // .then(function(account) {
                            //     var def = $q.defer();
                            //     return def.resolve(account.id);
                            // })
                            // .then(CartSvc.refreshCartAfterLogin)
                            .then(gotoLocation);
                    } else {
                        // AccountSvc.getCurrentAccount()
                            // .then(function(account) {
                            //     var def = $q.defer();
                            //     return def.resolve(account.id);
                            // })
                            // .then(CartSvc.refreshCartAfterLogin)
                            // .then(gotoLocation);
                        gotoLocation();
                    }
                }*/
            });
            //closeOffcanvas func for mask
            $rootScope.closeOffcanvas = function(){
                ipCookie("showCart", false);
                $rootScope.showMobileNav = false;
                $rootScope.showCart = false;
            };

            editableOptions.theme = 'bs3';
            editableThemes.bs3.submitTpl = '<button type="submit" class="btn btn-primary">{{\'SAVE\' | translate}}</button>';

            $rootScope.$on('authtoken:obtained', function(event, token){
                httpQueue.retryAll(token);
            });

            $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState){
                /*if ($ipCookie('goto')) {
                    var goto = $ipCookie('goto');

                    if (toState.name == goto.name) {
                        $ipCookie.remove('goto');
                        $ipCookie.remove('goto_params');
                    } else if (AuthSvc.isAuthenticated()) {
                        event.preventDefault();
                        return;
                    }
                }*/

                AuthDialogManager.close();
                var needsAuthentication = toState.data && toState.data.auth && toState.data.auth === 'authenticated';
                toState.repeat = false;
                AuthSvc.isAuthenticated();
                if ( needsAuthentication && !AuthSvc.isAuthenticated() ) {
                    // block immediate state transition
                    event.preventDefault();
                    if(!fromState.name){
                        $state.go(settings.homeState);
                    }

                    //Redirect to auth url with set cookie
                    /*$ipCookie('goto', toState);
                    $ipCookie('goto_params', toParams);
                    $ipCookie('goto_anon_cart', CartSvc.getLocalCart().id);

                    window.location = "/login.html";*/

                    var dlg = $injector.get('AuthDialogManager').open({windowClass:'mobileLoginModal'}, {}, {}, false);
                    dlg.then(function(){
                            $state.go(toState, toParams);
                        },
                        function(){
                            $state.go(settings.homeState);
                    });
                }
            });

            $rootScope.$on('$stateChangeSuccess', function(x, state){

                if (state && state.name == "base.checkout.details") $rootScope.$emit('cart:closeNow');
            });

            // Implemented as watch, since client-side determination of "logged" in depends on presence of token in cookie,
            //   which may be removed by browser/user
            $rootScope.$watch(function () {
                return AuthSvc.isAuthenticated();
            }, function (isAuthenticated, wasAuthenticated) {
                $rootScope.$broadcast(isAuthenticated ? 'user:signedin' : 'user:signedout', {new: isAuthenticated, old: wasAuthenticated});
                GlobalData.user.isAuthenticated = isAuthenticated;
            });

            $rootScope.$on('site:updated', function () {
                EventSvc.onSiteChange();
            });

            $rootScope.$on('language:updated', function (event, eveObj) {
                EventSvc.onLanguageChange(event, eveObj);
            });

            // setting root scope variables that drive class attributes in the BODY tag
            $rootScope.showMobileNav=false;
        }

    ]);


