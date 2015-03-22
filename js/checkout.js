;
//dummy
Billing =  Class.create();
Shipping =  Class.create();
$j = jQuery;

var IWD=IWD||{};

IWD.OPC = {
		
		agreements : null,
		saveOrderStatus:false,
		
		initMessages: function(){
			$j('.close-message-wrapper, .opc-messages-action .button').click(function(){
				$j('.opc-message-wrapper').hide();
				$j('.opc-message-container').empty();
			});
		},

		/** CREATE EVENT FOR SAVE ORDER **/
		initSaveOrder: function(){
			
			$j(document).on('click', '.opc-btn-checkout', function(){
				if (IWD.OPC.Checkout.disabledSave==true){
					return;
				}
				var addressForm = new VarienForm('billing-new-address-form');
				if (!addressForm.validator.validate()){				
					return;
				}
				
				if (!$j('input[name="billing[use_for_shipping]"]').prop('checked')){
					var addressForm = new VarienForm('opc-address-form-shipping');
					if (!addressForm.validator.validate()){				
						return;
					}
				}
				
				IWD.OPC.saveOrderStatus = true;
				
				if (IWD.OPC.Checkout.isVirtual===false){
					IWD.OPC.Shipping.saveShippingMethod();
				}else{
					IWD.OPC.validatePayment();
				}
			});
			
		},
		
		
		
		/** INIT CHAGE PAYMENT METHOD **/
		initPayment: function(){
			IWD.OPC.bindChangePaymentFields();
			$j(document).on('click', '#co-payment-form input[type="radio"]', function(event){
				IWD.OPC.validatePayment();
			});
		},
		
		/** CHECK PAYMENT IF PAYMENT IF CHECKED AND ALL REQUIRED FIELD ARE FILLED PUSH TO SAVE **/
		validatePayment: function(){	
			
			payment.validate();
			
			var paymentMethodForm = new Validation('co-payment-form', { onSubmit : false, stopOnFirst : false, focusOnError : false});
			  	
			if (paymentMethodForm.validate()){					
				IWD.OPC.savePayment();
			}else{
				IWD.OPC.saveOrderStatus = false;
				IWD.OPC.bindChangePaymentFields();
			}
			
			
		},
		
		/** BIND CHANGE PAYMENT FIELDS **/ 
		bindChangePaymentFields: function(){
			IWD.OPC.unbindChangePaymentFields();
			
			$j('#co-payment-form input').keyup(function(event){
				
				if (IWD.OPC.Checkout.ajaxProgress!=false){
					clearTimeout(IWD.OPC.Checkout.ajaxProgress);
				}
				
				IWD.OPC.Checkout.ajaxProgress = setTimeout(function(){
					IWD.OPC.validatePayment();
				}, 1000);
			});
			
			$j('#co-payment-form select').change(function(event){
				if (IWD.OPC.Checkout.ajaxProgress!=false){
					clearTimeout(IWD.OPC.Checkout.ajaxProgress);
				}
				
				IWD.OPC.Checkout.ajaxProgress = setTimeout(function(){
					IWD.OPC.validatePayment();
				}, 1000);
			});
		},
		
		/** UNBIND CHANGE PAYMENT FIELDS **/
		unbindChangePaymentFields: function(){
			$j('#co-payment-form input').unbind('keyup');
			$j('#co-payment-form select').unbind('change');
		},
				
		
		/** SAVE PAYMENT **/		
		savePayment: function(){
			
			if (IWD.OPC.Checkout.xhr!=null){
				IWD.OPC.Checkout.xhr.abort();
			}
			IWD.OPC.Checkout.showLoader();
			if (payment.currentMethod != 'stripe') {
				var form = $j('#co-payment-form').serializeArray();
				
				IWD.OPC.Checkout.xhr = $j.post(IWD.OPC.Checkout.config.baseUrl + 'onepage/json/savePayment',form, IWD.OPC.preparePaymentResponse,'json');
			}else{
			
				Stripe.createToken({
					
					name: $('stripe_cc_owner').value,
					number: $('stripe_cc_number').value,
					cvc: $('stripe_cc_cvc').value,
					exp_month: $('stripe_cc_expiration_month').value,
					exp_year: $('stripe_cc_expiration_year').value
				}, function(status, response) {
					if (response.error) {
						IWD.OPC.Checkout.hideLoader();
						IWD.OPC.Checkout.xhr = null;
						alert(response.error.message);
					} else {
						$('stripe_token').value = response['id'];
						var form = $j('#co-payment-form').serializeArray();
						IWD.OPC.Checkout.xhr = $j.post(IWD.OPC.Checkout.config.baseUrl + 'onepage/json/savePayment',form, IWD.OPC.preparePaymentResponse,'json');
					}
				});
			}
		},
		
		/** CHECK RESPONSE FROM AJAX AFTER SAVE PAYMENT METHOD **/
		preparePaymentResponse: function(response){
			IWD.OPC.Checkout.hideLoader();					
			IWD.OPC.Checkout.xhr = null;
			
			IWD.OPC.agreements = $j('#checkout-agreements').serializeArray();
			
			
			if (typeof(response.review)!= "undefined" && IWD.OPC.saveOrderStatus===false){					
				$j('#opc-review-block').html(response.review);
				IWD.OPC.Checkout.removePrice();
			}
			
			if (typeof(response.error) != "undefined"){
				
				IWD.OPC.Plugin.dispatch('error');
				
				$j('.opc-message-container').html(response.error);
				$j('.opc-message-wrapper').show();
				IWD.OPC.Checkout.hideLoader();
				IWD.OPC.saveOrderStatus = false;
				
				return;
			}
			
			//SOME PAYMENT METHOD REDIRECT CUSTOMER TO PAYMENT GATEWAY
			if (typeof(response.redirect) != "undefined" && IWD.OPC.saveOrderStatus===true){
				IWD.OPC.Checkout.xhr = null;
				IWD.OPC.Plugin.dispatch('redirectPayment', response.redirect);
				if (IWD.OPC.Checkout.xhr==null){
					setLocation(response.redirect);
				}
				return;
			}
			
			if (IWD.OPC.saveOrderStatus===true){
				IWD.OPC.saveOrder();				
			}
			
			IWD.OPC.Plugin.dispatch('savePaymentAfter');
			
			
		}, 
		
		/** SAVE ORDER **/
		saveOrder: function(){
			var form = $j('#co-payment-form').serializeArray();
			form  = IWD.OPC.checkAgreement(form);
			IWD.OPC.Checkout.showLoader();
			if (IWD.OPC.Checkout.config.comment!=="0"){
				IWD.OPC.saveCustomerComment();
			}
			
			IWD.OPC.Plugin.dispatch('saveOrder');
			IWD.OPC.Checkout.xhr = $j.post(IWD.OPC.Checkout.saveOrderUrl ,form, IWD.OPC.prepareOrderResponse,'json');
		},
		
		/** SAVE CUSTOMER COMMNET **/
		saveCustomerComment: function(){
			$j.post(IWD.OPC.Checkout.config.baseUrl + 'onepage/json/comment',{"comment": $j('#customer_comment').val()});
		}, 
		
		/** ADD AGGREMENTS TO ORDER FORM **/
		checkAgreement: function(form){
			$j.each(IWD.OPC.agreements, function(index, data){
				
				form.push(data);
			});
			return form;
		},
		
		
		/** CHECK RESPONSE FROM AJAX AFTER SAVE ORDER **/
		prepareOrderResponse: function(response){
			if (typeof(response.error) != "undefined" && response.error!=false){
				IWD.OPC.Checkout.hideLoader();
				IWD.OPC.saveOrderStatus = false;
				$j('.opc-message-container').html(response.error);
				$j('.opc-message-wrapper').show();
				IWD.OPC.Plugin.dispatch('error');
				return;
			}
			
			if (typeof(response.error_messages) != "undefined" && response.error_messages!=false){
				IWD.OPC.Checkout.hideLoader();
				IWD.OPC.saveOrderStatus = false;
				$j('.opc-message-container').html(response.error_messages);
				$j('.opc-message-wrapper').show();
				IWD.OPC.Plugin.dispatch('error');
				return;
			}
			
		
			if (typeof(response.redirect) !="undefined"){
				if (response.redirect!==false){
					setLocation(response.redirect);
					return;
				}
			}
			
			if (typeof(response.update_section) != "undefined"){
				IWD.OPC.Checkout.hideLoader();
				//create catch for default logic  - for not spam errors to console
				try{
					$j('#checkout-' + response.update_section.name + '-load').html(response.update_section.html);
				}catch(e){
					
				}
				
				IWD.OPC.prepareExtendPaymentForm();
				$j('#payflow-advanced-iframe').show();
				$j('#hss-iframe').show();
				
			}
			
			IWD.OPC.Plugin.dispatch('responseSaveOrder', response);
		},
		
		
};



IWD.OPC.Checkout = {
		config:null,
		ajaxProgress:false,
		xhr: null,
		isVirtual: false,
		disabledSave: false,
		saveOrderUrl: null,
		
		init:function(){		
			
			if (this.config==null){
				return;
			}
			//base config
			this.config = $j.parseJSON(this.config);
			
			IWD.OPC.Checkout.saveOrderUrl = IWD.OPC.Checkout.config.baseUrl + 'onepage/json/saveOrder',
			this.success = IWD.OPC.Checkout.config.baseUrl + 'checkout/onepage/success',
			
			//DECORATE
			this.clearOnChange();
			this.removePrice();
			
			
			
			//MAIN FUNCTION
			IWD.OPC.Billing.init();
			IWD.OPC.Shipping.init();	
			IWD.OPC.initMessages();
			IWD.OPC.initSaveOrder();
			
			
			if (this.config.isLoggedIn===1){
				var addressId = $j('#billing-address-select').val();
				if (addressId!='' && addressId!=undefined ){
					IWD.OPC.Billing.save();
				}else{
					//FIX FOR MAGENTO 1.8 - NEED LOAD PAYTMENT METHOD BY AJAX
					IWD.OPC.Checkout.pullPayments();
				}
			}else{
				//FIX FOR MAGENTO 1.8 - NEED LOAD PAYTMENT METHOD BY AJAX
				IWD.OPC.Checkout.pullPayments();
			}
			
			
						
			IWD.OPC.initPayment();
		},
		
		 
		
		/** PARSE RESPONSE FROM AJAX SAVE BILLING AND SHIPPING METHOD **/
		prepareAddressResponse: function(response){
			IWD.OPC.Checkout.xhr = null;
			
			IWD.OPC.Checkout.unlockPlaceOrder();
			if (typeof(response.error) != "undefined"){
				$j('.opc-message-container').html(response.message);
				$j('.opc-message-wrapper').show();
				IWD.OPC.Checkout.hideLoader();
				return;
			}
			
			/* IWD ADDRESS VALIDATION  */
            if (typeof(response.address_validation) != "undefined"){
                $j('#checkout-address-validation-load').empty().html(response.address_validation);
                IWD.OPC.Checkout.hideLoader();
                return;
            }
			
			if (typeof(response.shipping) != "undefined"){
				$j('#shipping-block-methods').empty().html(response.shipping);
			}
			
			if (typeof(response.payments) != "undefined"){
				$j('#checkout-payment-method-load').empty().html(response.payments);
				payment.initWhatIsCvvListeners();//default logic for view "what is this?"
				
			}
			
			if (typeof(response.isVirtual) != "undefined"){
				
				IWD.OPC.Checkout.isVirtual = true;
			}
			
			if (IWD.OPC.Checkout.isVirtual===false){
				IWD.OPC.Shipping.saveShippingMethod();
				
			}else{
				$j('.shipping-block').hide();
				$j('.payment-block').addClass('clear-margin');
				IWD.OPC.Checkout.pullPayments();
			}
		},
		
		/** PARSE RESPONSE FROM AJAX SAVE SHIPPING METHOD **/
		prepareShippingMethodResponse: function(response){
			IWD.OPC.Checkout.xhr = null;
			IWD.OPC.Checkout.hideLoader();
			if (typeof(response.error)!="undefined"){
				
				IWD.OPC.Plugin.dispatch('error');
				
				$j('.opc-message-container').html(response.message);
				$j('.opc-message-wrapper').show();
				IWD.OPC.saveOrderStatus = false;
				return;
			}
			
			if (typeof(response.review)!="undefined" && IWD.OPC.saveOrderStatus===false){
				try{
					$j('#opc-review-block').html(response.review);
				}catch(e){
					
				}
				IWD.OPC.Checkout.removePrice();
			}
			
			
			
			//IF STATUS TRUE - START SAVE PAYMENT FOR CREATE ORDER
			if (IWD.OPC.saveOrderStatus==true){
				IWD.OPC.validatePayment();
			}else{
				IWD.OPC.Checkout.pullPayments();
			}
		},
		
		
		clearOnChange: function(){
			$j('.opc-col-left input, .opc-col-left select').removeAttr('onclick').removeAttr('onchange');
		},
		
		removePrice: function(){
			
			$j('.opc-data-table tr th:nth-child(2)').remove();
			$j('.opc-data-table tbody tr td:nth-child(2)').remove();
			$j('.opc-data-table tfoot td').each(function(){
				var colspan = $j(this).attr('colspan');
				
				if (colspan!="" && colspan !=undefined){
					colspan = parseInt(colspan) - 1;
					$j(this).attr('colspan', colspan);
				}
			});
			
			$j('.opc-data-table tfoot th').each(function(){
				var colspan = $j(this).attr('colspan');
				
				if (colspan!="" && colspan !=undefined){
					colspan = parseInt(colspan) - 1;
					$j(this).attr('colspan', colspan);
				}
			});
			
		},
		
		showLoader: function(){
			//$j('.opc-ajax-loader').show();
			$j('.opc-btn-checkout').addClass('button-disabled');
		},
		
		hideLoader: function(){
			//$j('.opc-ajax-loader').hide();
			$j('.opc-btn-checkout').removeClass('button-disabled');
		},
		
		/** APPLY SHIPPING METHOD FORM TO BILLING FORM **/
		applyShippingMethod: function(form){
			formShippimgMethods = $j('#opc-co-shipping-method-form').serializeArray();
			$j.each(formShippimgMethods, function(index, data){
				form.push(data);
			});
			
			return form;
		},
		
		/** APPLY NEWSLETTER TO BILLING FORM **/
		applySubscribed: function(form){
			if ($j('#is_subscribed').length){
				if ($j('#is_subscribed').is(':checked')){
					form.push({"name":"is_subscribed", "value":"1"});
				}
			}
			
			return form;
		},
		
		/** PULL REVIEW **/
		pullReview: function(){
			IWD.OPC.Checkout.showLoader();
			IWD.OPC.Checkout.xhr = $j.post(IWD.OPC.Checkout.config.baseUrl + 'onepage/json/review',function(response){
				IWD.OPC.Checkout.hideLoader();
				if (typeof(response.review)!="undefined"){
					$j('#opc-review-block').html(response.review);
					IWD.OPC.Checkout.removePrice();
				}
			});
		},
		
		/** PULL PAYMENTS METHOD AFTER LOAD PAGE **/
		pullPayments: function(){
			IWD.OPC.Checkout.showLoader();
			IWD.OPC.Checkout.xhr = $j.post(IWD.OPC.Checkout.config.baseUrl + 'onepage/json/payments',function(response){
				IWD.OPC.Checkout.hideLoader();				
				
				if (typeof(response.error)!="undefined"){
					$j('.opc-message-container').html(response.error);
					$j('.opc-message-wrapper').show();
					IWD.OPC.saveOrderStatus = false;
					return;
				}
				
				if (typeof(response.payments)!="undefined"){
					$j('#checkout-payment-method-load').html(response.payments);
					payment.initWhatIsCvvListeners();
					IWD.OPC.bindChangePaymentFields();
				};
				
				IWD.OPC.Checkout.pullReview();
				
			},'json');
		},
		
		lockPlaceOrder: function(){
			$j('.opc-btn-checkout').addClass('button-disabled');
			IWD.OPC.Checkout.disabledSave = true;
		},
		
		unlockPlaceOrder: function(){
			$j('.opc-btn-checkout').removeClass('button-disabled');
			IWD.OPC.Checkout.disabledSave = false;
		}
	
};


IWD.OPC.Billing = {
			
		init: function(){
			//set flag use billing for shipping and init change flag
			this.setBillingForShipping(true);
			$j('input[name="billing[use_for_shipping]"]').change(function(){
				if ($j(this).is(':checked')){
					IWD.OPC.Billing.setBillingForShipping(true);
					$j('#opc-address-form-billing select[name="billing[country_id]"]').change();
				}else{
					IWD.OPC.Billing.setBillingForShipping(false);					
				}
			});
			
			
			//update password field
			$j('input[name="billing[create_account]"]').click(function(){
				if ($j(this).is(':checked')){
					$j('#register-customer-password').removeClass('hidden');
					$j('input[name="billing[customer_password]"]').addClass('required-entry');
					$j('input[name="billing[confirm_password]"]').addClass('required-entry');
				}else{
					$j('#register-customer-password').addClass('hidden');
					$j('input[name="billing[customer_password]"]').removeClass('required-entry');
					$j('input[name="billing[confirm_password]"]').removeClass('required-entry');
					$j('#register-customer-password input').val('');
				}
			});
			
			this.initChangeAddress();
			this.initChangeSelectAddress();
			
		},
		
		/** CREATE EVENT FOR UPDATE SHIPPING BLOCK **/
		initChangeAddress: function(){

			$j('#opc-address-form-billing input').keyup(function(){
				IWD.OPC.Billing.validateForm();
			});
			
			$j('#opc-address-form-billing input').focus(function(){
				clearTimeout(IWD.OPC.Checkout.ajaxProgress);
			});
			
			$j('#opc-address-form-billing select').not('#billing-address-select').change(function(){
				IWD.OPC.Billing.validateForm();
			});
		},
		
		validateForm: function(){
			setTimeout(function(){
				var valid = IWD.OPC.Billing.validateAddressForm();
				if (valid){
					IWD.OPC.Billing.save();
				}
			},200);
		},
		
		
		/** CREATE EVENT FOR CHANGE ADDRESS TO NEW OR FROM ADDRESS BOOK **/
		initChangeSelectAddress: function(){
			$j('#billing-address-select').change(function(){
				if ($j(this).val()==''){
					$j('#billing-new-address-form').show();
				}else{
					$j('#billing-new-address-form').hide();
					IWD.OPC.Billing.validateForm();
				}
			});
			
			
		},
		
		/** VALIDATE ADDRESS BEFORE SEND TO SAVE QUOTE**/
		validateAddressForm: function(form){
			
			  var addressForm = new Validation('opc-address-form-billing', { onSubmit : false, stopOnFirst : false, focusOnError : false});
			  if (addressForm.validate()){				  		 
				  return true;
			  }else{				 
				  return false;
			  }
		},
		
		/** SET SHIPPING AS BILLING TO TRUE OR FALSE **/
		setBillingForShipping:function(useBilling){
			if (useBilling==true){
				$j('input[name="billing[use_for_shipping]"]').prop('checked', true);
				$j('input[name="shipping[same_as_billing]"]').prop('checked', true);
				$j('#opc-address-form-shipping').addClass('hidden');				
			}else{
				this.pushBilingToShipping();	
				$j('input[name="billing[use_for_shipping]"]').prop('checked', false);
				$j('input[name="shipping[same_as_billing]"]').prop('checked', false);
				$j('#opc-address-form-shipping').removeClass('hidden');
			}
			
		}, 
		
		/** COPY FIELD FROM BILLING FORM TO SHIPPING **/
		pushBilingToShipping:function(clearShippingForm){
			//pull country
			var valueCountry = $j('#billing-new-address-form select[name="billing[country_id]"]').val();
			$j('#opc-address-form-shipping  select[name="shipping[country_id]"] [value="' + valueCountry + '"]').prop("selected", true);	
			shippingRegionUpdater.update();
			
			
			//pull region id
			var valueRegionId = $j('#billing-new-address-form select[name="billing[region_id]"]').val();
			$j('#opc-address-form-shipping  select[name="shipping[region_id]"] [value="' + valueRegionId + '"]').prop("selected", true);
			
			//pull other fields	
			$j('#billing-new-address-form input').not(':hidden, :input[type="checkbox"]').each(function(){
				var name = $j(this).attr('name');
				var value = $j(this).val();
				var shippingName =  name.replace( /billing/ , 'shipping');
				
				$j('#opc-address-form-shipping input[name="'+shippingName+'"]').val(value);

			});
			
			//pull address field
			$j('#billing-new-address-form input[name="billing[street][]"]').each(function(indexBilling){
				var valueAddress = $j(this).val();
				$j('#opc-address-form-shipping input[name="shipping[street][]"]').each(function(indexShipping){
					if (indexBilling==indexShipping){
						$j(this).val(valueAddress);
					}
				});				
			});
			
			//init trigger change shipping form
			$j('#opc-address-form-shipping select[name="shipping[country_id]"]').change();
		},

		/** METHOD CREATE AJAX REQUEST FOR UPDATE SHIPPING METHOD **/
		save: function(){
			if (IWD.OPC.Checkout.ajaxProgress!=false){
				clearTimeout(IWD.OPC.Checkout.ajaxProgress);
			}
			
			IWD.OPC.Checkout.ajaxProgress = setTimeout(function(){
					var form = $j('#opc-address-form-billing').serializeArray();
					form = IWD.OPC.Checkout.applyShippingMethod(form);					
					form = IWD.OPC.Checkout.applySubscribed(form); 
					
					if (IWD.OPC.Checkout.xhr!=null){
						IWD.OPC.Checkout.xhr.abort();
					}
					//IWD.OPC.Checkout.showLoader();
					IWD.OPC.Checkout.lockPlaceOrder();
					IWD.OPC.Checkout.xhr = $j.post(IWD.OPC.Checkout.config.baseUrl + 'onepage/json/saveBilling',form, IWD.OPC.Checkout.prepareAddressResponse,'json');
			}, 600);
		},
		
		

		
};

IWD.OPC.Shipping = {
		
		
		init: function(){
		
			this.initChangeAddress();
			this.initChangeSelectAddress();
			this.initChangeShippingMethod();
		},

		/** CREATE EVENT FOR UPDATE SHIPPING BLOCK **/
		initChangeAddress: function(){
			
			$j('#opc-address-form-shipping input').blur(function(){
				IWD.OPC.Shipping.validateForm();
			});
			
			$j('#opc-address-form-shipping input').focus(function(){
				clearTimeout(IWD.OPC.Checkout.ajaxProgress);
			});
			
			
			$j('#opc-address-form-shipping select').not('#shipping-address-select').change(function(){
				IWD.OPC.Shipping.validateForm();
			});
		},
		
		/** CREATE VENT FOR CHANGE ADDRESS TO NEW OR FROM ADDRESS BOOK **/
		initChangeSelectAddress: function(){
			$j('#shipping-address-select').change(function(){
				if ($j(this).val()==''){
					$j('#shipping-new-address-form').show();
				}else{
					$j('#shipping-new-address-form').hide();
					IWD.OPC.Shipping.validateForm();
				}
			});
			
			
		},
		
		//create observer for change shipping method. 
		initChangeShippingMethod: function(){
			
			$j('.opc-wrapper-opc #shipping-block-methods').on('change', 'input[type="radio"]', function(){
				
				IWD.OPC.Shipping.saveShippingMethod();
				
			});
			
		},
		
		validateForm: function(){
			setTimeout(function(){
				var valid = IWD.OPC.Shipping.validateAddressForm();
				if (valid){
					IWD.OPC.Shipping.save();
				}
			},200);
		},
		
		/** VALIDATE ADDRESS BEFORE SEND TO SAVE QUOTE**/
		validateAddressForm: function(form){
			
			  var addressForm = new Validation('opc-address-form-shipping', { onSubmit : false, stopOnFirst : false, focusOnError : false});
			  if (addressForm.validate()){				  		 
				  return true;
			  }else{				 
				  return false;
			  }
		},
		
		/** METHOD CREATE AJAX REQUEST FOR UPDATE SHIPPIN METHOD **/
		save: function(){
			if (IWD.OPC.Checkout.ajaxProgress!=false){
				clearTimeout(IWD.OPC.Checkout.ajaxProgress);
			}
			
			IWD.OPC.Checkout.ajaxProgress = setTimeout(function(){
					var form = $j('#opc-address-form-shipping').serializeArray();
					form = IWD.OPC.Checkout.applyShippingMethod(form);
					if (IWD.OPC.Checkout.xhr!=null){
						IWD.OPC.Checkout.xhr.abort();
					}
					IWD.OPC.Checkout.showLoader();
					IWD.OPC.Checkout.xhr = $j.post(IWD.OPC.Checkout.config.baseUrl + 'onepage/json/saveShipping',form, IWD.OPC.Checkout.prepareAddressResponse,'json');
			}, 300);
		},
		
		saveShippingMethod: function(){
			
			if (IWD.OPC.Shipping.validateShippingMethod()===false){

				if (IWD.OPC.saveOrderStatus){	
					$j('.opc-message-container').html('Please specify shipping method');
					$j('.opc-message-wrapper').show();
				}
				IWD.OPC.saveOrderStatus = false;
					
				IWD.OPC.Checkout.hideLoader();
				
				return;
			}
					
			
			if (IWD.OPC.Checkout.ajaxProgress!=false){
				clearTimeout(IWD.OPC.Checkout.ajaxProgress);
			}
			
			IWD.OPC.Checkout.ajaxProgress = setTimeout(function(){
				var form = $j('#opc-co-shipping-method-form').serializeArray();
				form = IWD.OPC.Checkout.applySubscribed(form); 
				if (IWD.OPC.Checkout.xhr!=null){
					IWD.OPC.Checkout.xhr.abort();
				}
				IWD.OPC.Checkout.showLoader();
				IWD.OPC.Checkout.xhr = $j.post(IWD.OPC.Checkout.config.baseUrl + 'onepage/json/saveShippingMethod',form, IWD.OPC.Checkout.prepareShippingMethodResponse);
			}, 300);
		},
		
		validateShippingMethod: function(){			
			var shippingChecked = false;
			$j('#opc-co-shipping-method-form input').each(function(){				
				if ($j(this).prop('checked')){							
					shippingChecked =  true;
				}
			});
			
			return shippingChecked;
		}		
};


IWD.OPC.Coupon = {
		init: function(){
			
			
			$j(document).on('click', '.apply-coupon', function(){
				IWD.OPC.Coupon.applyCoupon(false);
			});
			
			
			$j(document).on('click', '.remove-coupon', function(){
				IWD.OPC.Coupon.applyCoupon(true);
			});
			
			
			$j(document).on('click','.discount-block h3', function(){
				if ($j(this).hasClass('open-block')){
					$j(this).removeClass('open-block');
					$j('#opc-discount-coupon-form').hide();
				}else{
					$j(this).addClass('open-block');
					$j('#opc-discount-coupon-form').show();
				}
			});
			
		},
		
		applyCoupon: function(remove){
			
			var form = $j('#opc-discount-coupon-form').serializeArray();
			if (remove===false){				
				form.push({"name":"remove", "value":"0"});
			}else{
				form.push({"name":"remove", "value":"1"});
			}
			
			IWD.OPC.Checkout.showLoader();
			IWD.OPC.Checkout.xhr = $j.post(IWD.OPC.Checkout.config.baseUrl + 'onepage/coupon/couponPost',form, IWD.OPC.Coupon.prepareResponse,'json');
		},
		
		prepareResponse: function(response){
			IWD.OPC.Checkout.hideLoader();
			if (typeof(response.message) != "undefined"){
				$j('.opc-message-container').html(response.message);
				$j('.opc-message-wrapper').show();
				
				IWD.OPC.Checkout.pullReview();
			}
			if (typeof(response.coupon) != "undefined"){
				$j(response.coupon).replaceWith('#opc-discount-coupon-form');
			}
			
		}
};

IWD.OPC.Agreement ={
		
		init: function(){
			
			$j(document).on('click', '.view-agreement', function(e){
				e.preventDefault();
				$j('#modal-agreement').addClass('md-show');
				
				var id = $j(this).data('id');
				var title = $j(this).html();
				var content = $j('#agreement-block-'+id).html();
				
				$j('#agreement-title').html(title);
				$j('#agreement-modal-body').html(content);
			});
			
		}
};

IWD.OPC.Login ={
		
		init: function(){
			$j('.login-trigger').click(function(e){
				e.preventDefault();
				$j('#modal-login').addClass('md-show');
			});
			
			$j(document).on('click','.md-modal .close', function(e){
				e.preventDefault();
				$j('.md-modal').removeClass('md-show');
			});
			
			$j(document).on('click', '.restore-account', function(e){
				e.preventDefault();
				$j('#login-form').hide();$j('#login-button-set').hide();
				$j('#form-validate-email').fadeIn();$j('#forgotpassword-button-set').show();
			});
			
			
			$j('#login-button-set .btn').click(function(){
				$j('#login-form').submit();
			});
			
			$j('#forgotpassword-button-set .btn').click(function(){
				var form = $j('#form-validate-email').serializeArray();
				IWD.OPC.Checkout.showLoader();
				IWD.OPC.Checkout.xhr = $j.post(IWD.OPC.Checkout.config.baseUrl + 'onepage/json/forgotpassword',form, IWD.OPC.Login.prepareResponse,'json');
			});
			
			
			$j('#forgotpassword-button-set .back-link').click(function(e){
				e.preventDefault();
				$j('#form-validate-email').hide();$j('#forgotpassword-button-set').hide();
				$j('#login-form').fadeIn();$j('#login-button-set').show();
				
			});
			
		},
		
		prepareResponse: function(response){
			IWD.OPC.Checkout.hideLoader();
			if (typeof(response.error)!="undefined"){
				alert(response.message);
			}else{
				alert(response.message);
				$j('#forgotpassword-button-set .back-link').click();
			}
		}
};

IWD.OPC.Geo = {
		init: function(){
			
			if (IWD.OPC.Checkout.config.geoCountry===false){			
				return;
			}else{
				//setup country for billing and than for shipping
				if ($j('#opc-address-form-billing select[name="billing[country_id]"]').is(":visible")){					
					$j('#opc-address-form-billing select[name="billing[country_id]"]').val(IWD.OPC.Checkout.config.geoCountry);
					billingRegionUpdater .update();
				}				
			}
				
			
			if (IWD.OPC.Checkout.config.geoCity===false){			
				return;
			}else{
				$j('#opc-address-form-billing [name="billing[city]"]').val(IWD.OPC.Checkout.config.geoCity);														
			}
			
			
		}
};

$j(document).ready(function(){
	IWD.OPC.Checkout.init();
	IWD.OPC.Coupon.init();
	IWD.OPC.Agreement.init();
	IWD.OPC.Login.init();
	IWD.OPC.Geo.init();
});
