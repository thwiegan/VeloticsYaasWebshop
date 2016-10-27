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

angular.module('ds.checkout')
     /** The checkout service provides functions to pre-validate the credit card through Stripe,
      * and to create an order.
      */
    .factory('CheckoutSvc', ['CheckoutREST', 'StripeJS', 'CartSvc', 'settings', '$q', 'GlobalData', 'CartREST',
        function (CheckoutREST, StripeJS, CartSvc, settings, $q, GlobalData, CartREST) {

        /** CreditCard object prototype */
        var CreditCard = function () {
            this.number = null;
            this.cvc = null;
            this.expMonth = null;
            this.expYear = null;
        };

        /** Order prototype for start of checkout.*/
        var DefaultOrder = function () {
            this.shipTo = {};
            this.billTo = {};
            this.billTo.country = 'US';

            this.payment = {
                paymentId: 'stripe',
                customAttributes: {
                    token: ''
                }
            };

            this.creditCard = new CreditCard();
        };

        /** Error types to distinguish between Stripe validation and order submission errors
         * during checkout. */
        var ERROR_TYPES = {
            stripe: 'STRIPE_ERROR',
            order: 'ORDER_ERROR'
        };

        return {

            ERROR_TYPES: ERROR_TYPES,

            /** Returns a blank order for a clean checkout page.*/
            getDefaultOrder: function () {
                return new DefaultOrder();
            },

            /** Performs Stripe validation of the credit card, and if successful,
             * creates a new order.
             */
            checkout: function (order) {

                // the promise handle to the result of the transaction
                var deferred = $q.defer();
                var stripeData = {};
                /* jshint ignore:start */
                var creditCard = order.creditCard;
                stripeData.number = creditCard.number;
                stripeData.exp_month = creditCard.expMonth;
                stripeData.exp_year = creditCard.expYear;
                stripeData.cvc = creditCard.cvc;
                /* jshint ignore:end */

                var self = this;
                try {
                	console.log('order=' + order);
                	/*self.createOrder(order).then(
                            // success handler
                            function (order) {
                                deferred.resolve(order);
                            },
                            // error handler
                            function(errorResponse){
                            	
                            	console.log('errorResponse=' + errorResponse);

                                var errMsg = '';

                                if(errorResponse.status === 500) {
                                    errMsg = 'Cannot process this order because the system is unavailable. Try again at a later time.';
                                } else {
                                    errMsg = 'Order could not be processed.';
                                    if(errorResponse) {
                                        if(errorResponse.status) {
                                            errMsg += ' Status code: '+errorResponse.status+'.';
                                        }
                                        if(errorResponse.data && errorResponse.data.details && errorResponse.data.details.length) {
                                            angular.forEach(errorResponse.data.details, function (errorDetail) {
                                                errMsg += ' ' + errorDetail.message;
                                            });
                                        }
                                    }
                                }
                                deferred.reject({ type: ERROR_TYPES.order, error: errMsg });
                            }
                        );*/
                	
                	
                    StripeJS.createToken(stripeData, function (status, response) {

                        if (response.error) {
                            deferred.reject({ type: ERROR_TYPES.stripe, error: response.error });
                        } else {
                            self.createOrder(order, response.id).then(
                                // success handler
                                function (order) {

                                    deferred.resolve(order);
                                },
                                // error handler
                                function(errorResponse){
                                    var errMsg = '';

                                    if(errorResponse.status === 500) {
                                        errMsg = 'Cannot process this order because the system is unavailable. Try again at a later time.';
                                    } else {
                                        errMsg = 'Order could not be processed.';
                                        if(errorResponse) {
                                            if(errorResponse.status) {
                                                errMsg += ' Status code: '+errorResponse.status+'.';
                                            }
                                            if(errorResponse.data && errorResponse.data.details && errorResponse.data.details.length) {
                                                angular.forEach(errorResponse.data.details, function (errorDetail) {
                                                    errMsg += ' ' + errorDetail.message;
                                                });
                                            }
                                        }
                                    }
                                    deferred.reject({ type: ERROR_TYPES.order, error: errMsg });
                                }
                            );
                        }
                    });
                }
                catch (error) {
                    console.error('Exception occurred during checkout: '+JSON.stringify(error));
                    error.type = 'payment_token_error';
                    deferred.reject({ type: ERROR_TYPES.stripe, error: error });
                }
                return deferred.promise;
            },


            /**
             * Issues a Orders 'save' (POST) on the order resource.
             * Uses the CartSvc to retrieve the current set of line items.
             * @param order
             * @param validated Stripe token
             * @return The result array as returned by Angular $resource.query().
             */
            createOrder: function(order, token) {
                var Order = function () {};
                var newOrder = new Order();
                newOrder.cartId = order && order.cart && order.cart.id ? order.cart.id : null;
                newOrder.payment = order.payment;
                newOrder.payment.customAttributes.token = token; //replaced parameter
                newOrder.currency = order.cart.currency;
                if (order.shipping) {
                    newOrder.shipping = {
                        methodId: order.shipping.id,
                        amount: order.shipping.fee.amount,
                        zoneId: order.shipping.zoneId
                    };
                }

                newOrder.totalPrice =  order.cart.totalPrice.amount;
                newOrder.addresses = [];
                var billTo = {};
                billTo.contactName = order.billTo.contactName;
                billTo.companyName = order.billTo.companyName;
                billTo.street = order.billTo.address1;
                billTo.streetAppendix = order.billTo.address2;
                billTo.city = order.billTo.city;
                billTo.state = order.billTo.state;
                billTo.zipCode = order.billTo.zipCode;
                billTo.country = order.billTo.country;
                billTo.account = order.account.email;
                billTo.contactPhone = order.billTo.contactPhone;
                billTo.type = 'BILLING';
                newOrder.addresses.push(billTo);

                var shipTo = {};
                shipTo.contactName = order.shipTo.contactName;
                shipTo.companyName = order.shipTo.companyName;
                shipTo.street = order.shipTo.address1;
                shipTo.streetAppendix = order.shipTo.address2;
                shipTo.city = order.shipTo.city;
                shipTo.state = order.shipTo.state;
                shipTo.zipCode = order.shipTo.zipCode;
                shipTo.country = order.shipTo.country;
                shipTo.account = order.account.email;
                shipTo.contactPhone = order.shipTo.contactPhone;
                shipTo.type = 'SHIPPING';
                newOrder.addresses.push(shipTo);

                newOrder.customer = {};
                newOrder.customer.id = order.cart.customerId;
                if (order.account.title && order.account.title !== '') {
                    newOrder.customer.title = order.account.title;
                }
                if (order.account.firstName && order.account.firstName !== '') {
                    newOrder.customer.firstName = order.account.firstName;
                }
                if (order.account.middleName && order.account.middleName !== '') {
                    newOrder.customer.middleName = order.account.middleName;
                }
                if (order.account.lastName && order.account.lastName !== '') {
                    newOrder.customer.lastName = order.account.lastName;
                }
                newOrder.customer.email = order.account.email;

                // Will be submitted as "hybris-user" request header
                settings.hybrisUser = order.account.email;

                /* CUSTOM */

                //Helper function for Bearer token
                var readCookieByName = function(name) {
                    var nameEQ = name + "=";
                    var ca = document.cookie.split(';');
                    for (var i = 0; i < ca.length; i++) {
                        var c = ca[i];
                        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
                    }
                    return null;
                }

                // Error callback
                function error( reason ) {
                    console.error(reason);
                }

                var s4Prods = [];

                function getUser() {
                    return $.ajax({ 
                        type: 'GET', 
                        url: '/api/authenticated/user?autocreate=true', 
                        dataType: 'json'
                    });
                }

                // Callback function takes product details and creates order in S4 system
                function orderInS4( item ) {
                    return function( result ) {
                        var categories = result.categories.map( function(category) {
                            return category.name;
                        });

                        if (categories.indexOf("E-Bikes") != -1) {
                            var order = {
                                Qty: item.quantity,
                                Material: result.product.sku
                            };

                            return $.ajax({
                                    url: "/api/unauthenticated/order/material",
                                    method: "POST",
                                    contentType: 'application/json',
                                    accept: 'application/json',
                                    data: JSON.stringify(order)
                                });
                        } else {
                            return;
                        }
                    }
                }

                // Callback function takes Serialnumber response from S4 system and updates order item
                function updateItem( item ) {
                    return function( result ) {
                        console.log(result);

                        if ( result && result.order.d && result.order.d.Message )
                        {
                            var material = result.order.d.Material;
                            var message = result.order.d.Message;
                            var orderId = parseInt(message.substring(12));
                            var serialnumbers = result.order.d.SerialNo.split(",");
                            serialnumbers.shift();

                            var filtered = [];

                            for (var i = 0; i < serialnumbers.length; i++) {
                                if (serialnumbers[i].length > 0) {
                                    filtered.push(serialnumbers[i]);
                                }
                            }

                            s4Prods.push({
                                serialnumbers: filtered,
                                orderId: orderId
                            });

                            if (!item.metadata) item.metadata = {};
                            if (!item.metadata.mixins) item.metadata.mixins = {};
                            item.metadata.mixins.s4data = "https://api.yaas.io/hybris/schema/v1/veloticswebshop/s4data.v2.json";
                            if (!item.mixins) item.mixins = {};
                            if (!item.mixins.s4data) item.mixins.s4data = {};
                            item.mixins.s4data.orderId = orderId + "";
                            item.mixins.s4data.serialnumbers = serialnumbers;

                           return CartREST.Cart.one('carts', order.cart.id).all('items').customPUT(item, item.id);
                        } else {
                            return;
                        }    
                   }
                }

                // Read bearer token
                var cookie = JSON.parse(decodeURIComponent(readCookieByName("auth.user")));

                // Produce promise for each order item
                var promises = order.cart.items.map( function( item ) {
                    return (function(item) {
                        var product = item.product;
                        return $.ajax({
                                url: "https://api.yaas.io/hybris/productdetails/v1/veloticswebshop/productdetails/" + product.id,
                                beforeSend: function(xhr){xhr.setRequestHeader('Authorization', 'Bearer ' + cookie.accessToken);}
                            })
                            .then(orderInS4(item), error)
                            .then(updateItem(item), error);
                            
                    })(item);
                });

                /* END CUSTOM */

                // Wait for all order items to be updated, then create order in YaaS
                return Promise.all( promises ).then( function( values ) {
                    var p = CheckoutREST.Checkout.all('checkouts').all('order').post(newOrder);
                    var yaasOrderId;
                    return p.then(function(order) {
                        yaasOrderId = order.orderId;
                        return getUser();
                    }).then(function(user) {
                        var snPromises = [];
                        for (var key = 0; key < s4Prods.length; key++) {
                            var prod = s4Prods[key];
                            for (var idx = 0; idx < prod.serialnumbers.length; idx++) {
                                var sn = prod.serialnumbers[idx];
                                var d = {
                                    YAASORDERNUMBER: yaasOrderId + "",
                                    SALESORDERNUMBER: prod.orderId + "",
                                    SERIALNUMBER: sn,
                                    USERID: user.hcpuser.name,
                                    TIMESTAMP: "/Date(" + new Date().getTime() + ")/"
                                }

                                snPromises.push( $.ajax({
                                    url: "https://platformvelotics.itc.sap.com:443/bike-mgmt/v1/OrderHistory/orders/Orders",
                                    method: "POST",
                                    contentType: 'application/json',
                                    accept: 'application/json',
                                    data: JSON.stringify(d),
                                    xhrFields: {
                                        withCredentials: true
                                    },
                                    beforeSend: function(xhr){xhr.setRequestHeader('apikey', '2T3CvtqwpdLmdSVf41wgC6xATwCWwadV');}
                                }));
                            }
                        }

                        return Promise.all(snPromises);
                    }).then(function() {
                        return p;
                    });
                }, error);
            },

            /** Returns the shipping costs for this tenant.  If no cost found, it will be set to zero.
             */
            getShippingCost: function() {
                var deferred = $q.defer();

                var defaultCost = {};
                defaultCost.price = {};
                defaultCost.price[GlobalData.getCurrencyId()] = 0;
                
                CheckoutREST.ShippingCosts.all('shippingcosts').getList().then(function(shippingCosts){
                    var costs = shippingCosts.length && shippingCosts[0].price ? shippingCosts[0].plain() : defaultCost;
                    deferred.resolve(costs);
                }, function(failure){
                    if (failure.status === 404) {
                        deferred.resolve(defaultCost);
                    } else {
                        deferred.reject(failure);
                    }
                });

                return deferred.promise;
            },

            resetCart: function () {
                CartSvc.resetCart();
            }

        };

    }]);
