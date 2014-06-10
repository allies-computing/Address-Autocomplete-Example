/*************************************************************
    Released under the GNU General Public License

    The following copyright announcement is in compliance
    to section 2c of the GNU General Public License, and
    thus can not be removed, or can only be modified
    appropriately.

    Please leave this comment intact together with the
    following copyright announcement.

    Copyright(c) 2014 Allies Computing Ltd

    The authors provide no warranty.

    PostCoder Web Auto Complete Version 1.0.0.0
    By Allies Computing Ltd - www.alliescomputing.com

    Requires jQuery, scrollTo
*************************************************************/

;(function ($) {
"use strict";

    var constants = {
      'searchURL': 'https://ws.postcoder.com/pcw/{{key}}/autocomplete/UK/',
      'browseURL': 'https://ws.postcoder.com/pcw/{{key}}/autocompletebrowse/UK/',
      'finishURL': 'https://ws.postcoder.com/pcw/{{key}}/address/UK/{{searchterm}}?nodeid='
    };

    $.pcwAutoComplete = function(element, options) {

        var defaults = {
            apikey: '',   // Enter your API Key.
            addresslines: '3', // number of address lines to return
            exclude: 'organisation', // fields to exclude from the address lines
            identifier: 'Autocomplete Example', 
            debug: true,
            addressSelectClass: 'unstyled dropdown-menu',
            addressBrowseClass: 'unstyled dropdown-menu',
            addressFinishClass: 'pcw-result',
            browseText: 'Enter the Organisation or Premise',
            searchText: 'Enter a postcode, street or address',
            returnToSearchBtn: '<button class="btn tip hide btn-info" title="Back to previous results"><i class="fa fa-chevron-left"></i></button>',
            jsonCallback: 'jsonCallback',

            /**********************************
            * processAddress
            * Recieves the final address for processing.
            *
            * Edit this function to display the address as you require.
            *
            **********************************/
            processAddress: function(address){

              // simply display all key => value pairs as a description list.
              var result = $('<dl></dl>');
              for (var key in address) {
                if (address.hasOwnProperty(key)) {
                  result.append( '<dt>' + key + '</dt><dd>'+ address[key] + '</dd>');
                }
              }
              plugin.pcwAddressFinish.html('').html( result );

            }
        }

        var plugin = this;

        plugin.config = {}

        var $element = $(element), 
             element = element; 

        plugin.init = function() {

            if (typeof console == "undefined") {
              console = {log: function() {}, info: function() {}, error: function() {}}; 
            }
            if (!console.log) {console.log = function() {};}
            if (!console.info) {console.info = function() {};}
            if (!console.error) {console.error = function() {};}

            plugin.config = $.extend({}, defaults, options);

            plugin.pcwAddressSelect = $('<ul class="'+plugin.config.addressSelectClass+'"></ul>');
            plugin.pcwAddressBrowse = $('<ul class="'+plugin.config.addressBrowseClass+'"></ul>');
            plugin.pcwAddressFinish = $('<div class="'+plugin.config.addressFinishClass+'"></div>');
            plugin.pcwClear = $('<div class="clearfix"></div>');
            plugin.pcwReturnToSearchBtn = $(plugin.config.returnToSearchBtn);
            plugin.pcwInput = $element;
            plugin.pcwInput.data('apikey',plugin.config.apikey);

            debug("init();",2);

            plugin.pcwInput.before(plugin.pcwReturnToSearchBtn).after(plugin.pcwAddressSelect).attr('placeholder',plugin.config.searchText).attr('autocomplete','off');
            plugin.pcwInput.parent().parent().after(plugin.pcwAddressFinish).after(plugin.pcwClear);
            plugin.pcwAddressSelect.after(plugin.pcwAddressBrowse);

            plugin.pcwAddressSelect.on('show',function(){
              if (!plugin.pcwAddressSelect.is(":visible")){
                plugin.pcwAddressSelect.show();
              }
            }).on('hide',function(){
              if (plugin.pcwAddressSelect.is(":visible")){
                plugin.pcwAddressSelect.hide();
              }
            });

            plugin.pcwAddressBrowse.on('show',function(){
              if (!plugin.pcwAddressBrowse.is(":visible")){
                plugin.pcwAddressBrowse.show();
              }
            }).on('hide',function(){
              if (plugin.pcwAddressBrowse.is(":visible")){
                plugin.pcwAddressBrowse.hide();
              }
            });

            // attach default change event to search input
            plugin.pcwInput.on('keyup.pcwAutoComplete focus.pcwAutoComplete',function (evt) {
              search(evt);
            });

            // on click browse item
            plugin.pcwInput.parent().on('click.pcwAutoComplete','a.browse',function(e){
              e.preventDefault();
              e.stopImmediatePropagation();

              debug('clicked to browse: '+$(this).data('browse-id'));

              if ($(this).data('browse-id') != ''){
                
                // get the browse details
                browse($(this).data('browse-id'));

              }else{
                // error
                debug('Browse ID not found',2);
              }

            });


            // on click browse item
            plugin.pcwInput.parent().on('click.pcwAutoComplete','a.finish',function(e){
              e.preventDefault();
              e.stopImmediatePropagation();

              debug('clicked to finish: '+$(this).data('finish-id'));

              if ($(this).data('finish-id') != ''){
                // get the browse details

                finish($(this).data('finish-id'));

              }else{
                // error 
                debug('Finish ID not found',2);
              }

            });


            // back to search button
            plugin.pcwReturnToSearchBtn.on('click.pcwAutoComplete',function(e){

              e.preventDefault();
              e.stopPropagation();

              // get the last search value
              var searchtext = plugin.pcwInput.data('search-text');
              var history = plugin.pcwInput.data('browse-history');
              var lastbrowse = history.pop();

              if (history.length == 0){
                // go back to search mode

                //remove the back button
                plugin.pcwReturnToSearchBtn.hide();
                //hide the browse list
                plugin.pcwAddressBrowse.trigger('hide');

                // keyup now searches result
                plugin.pcwInput.off('keyup.pcwAutoComplete focus.pcwAutoComplete').on('keyup.pcwAutoComplete focus.pcwAutoComplete',function (evt) {
                  search(evt);
                });

                plugin.pcwInput.val(searchtext).addClass('span10').removeClass('span9').focus().attr('placeholder',plugin.config.searchText);

              }else{
                // still in browse mode

                lastbrowse = history.pop();

                plugin.pcwInput.data('browse-history', history);

                browse(lastbrowse);

              }

            });


            var liSelected;
            plugin.pcwInput.parent().on('keydown.pcwAutoComplete', function(e){

              // which drop down is in use
              var pcwselect = (plugin.pcwAddressSelect.is(":visible")) ? plugin.pcwAddressSelect : plugin.pcwAddressBrowse ;

              if (e.which === 40){
                // down arrow key
                if (liSelected){
                  liSelected.removeClass('active');

                  var nextLi = liSelected.nextUntil(':visible').add(liSelected).last().next();

                  if(nextLi.length > 0){
                    liSelected = nextLi.addClass('active');

                    pcwselect.scrollTo(liSelected, { offset:{top:-270} });
                    
                  }else{
                    liSelected = pcwselect.find('li:visible').first().addClass('active');
                    pcwselect.scrollTo(liSelected, { offset:{top:-270} });
                  }
                }else{
                  liSelected = pcwselect.find('li:visible').first().addClass('active');
                  pcwselect.scrollTo(liSelected, { offset:{top:-270} });
                }
              }else if (e.which === 38){
                // up arrow key
                if (liSelected){
                  liSelected.removeClass('active');

                  nextLi = liSelected.prevUntil(':visible').add(liSelected).first().prev();

                  if(nextLi.length > 0){
                    liSelected = nextLi.addClass('active');
                    pcwselect.scrollTo(liSelected, { offset:{top:-270} });
                  }else{
                    liSelected = pcwselect.find('li:visible').last().addClass('active');
                    pcwselect.scrollTo(liSelected, { offset:{top:-270} });
                  }
                }else{
                  liSelected = pcwselect.find('li:visible').last().addClass('active');
                  pcwselect.scrollTo(liSelected, { offset:{top:-270} });
                }
              }else if (e.which === 37){
                // left key press
                if (plugin.pcwReturnToSearchBtn.is(':visible')){
                  plugin.pcwReturnToSearchBtn.click();
                }

              }else if (e.which === 13){
                // enter key
                if (liSelected){

                  e.preventDefault();

                  debug('simulate click');

                  liSelected.children('a').click();

                }else{
                  // error ?
                }
              }
            });


            // close when click away
            $(document).on('click.pcwAutoComplete', function(e) {
                if (!($(e.target).parents().is(plugin.pcwInput.parent()) ) ) {
                  plugin.pcwAddressSelect.trigger('hide');
                  plugin.pcwAddressBrowse.trigger('hide');
                }
            });

            return plugin;

        }


        /*
        *   search(evt)
        *
        *   Search the auto complete service
        */
        function search(evt){

          if (evt){
            // don't search if pressing keys to navigate the list
            switch(evt.which){
              case 13:
              case 37:
              case 38:
              case 40:
                evt.preventDefault();
                evt.stopPropagation();
                return false;                
                break;
            }
          }

          var searchstring = plugin.pcwInput.val();

          if (searchstring == ''){
            return;
          }

          // store the search string
          plugin.pcwInput.data('search-text',searchstring);

          if ($.trim(searchstring) == ''){
            return false;
          }
          
          $.ajax({
              url: constants.searchURL.replace('{{key}}', plugin.config.apikey) + searchstring,
              type: 'GET',
              dataType: 'jsonp',
              success: function(data){
                
                var addresses = data.predictions;

                if (addresses.length > 0){

                  if (addresses.length == 1){
                    // go straight to browse ??
                    //browse(addresses[0][1]);
                  }

                  plugin.pcwAddressBrowse.trigger('hide');
                  plugin.pcwAddressSelect.html('');

                  // check searchstring is still current.
                  if (searchstring === plugin.pcwInput.val()){
                    
                    // add the addresses to the Select drop down
                    $.each(addresses, function(index, value){
                      var listitem = $('<li></li>');
                      var css = (value.complete) ? 'finish' : 'browse';
                      var listitemlink = $('<a href="#" class="'+css+'">'+value.prediction+'</a>').data((value.complete)?'finish-id':'browse-id',value.refs);

                      plugin.pcwAddressSelect.append(listitem.append(listitemlink)).trigger('show');

                    });

                  }

                }else{
                  // try and filter any results we already have ??
                  //filter(plugin.pcwAddressSelect, evt);
                }

              },
              error: function() { debug('Search failed',2) },
              timeout: 2000
          });
        } // end function search



        /*
        *   browse(browseId)
        *
        *   Browse the auto complete service
        */
        function browse(browseId){

          debug('browsing: '+browseId);

          var dataset = plugin.config.dataset;

          $.ajax({
              url: constants.browseURL.replace('{{key}}', plugin.config.apikey) + browseId,
              type: 'GET',
              dataType: 'jsonp',
              success: function(data){
                
                var addresses = data.addresses;

                //debug(addresses,2);

                // store the current input then clear it, focus and change placeholder text
                // first get any existing data (Array)
                var history = plugin.pcwInput.data('browse-history') || [];
                // add new data
                history.push(browseId);

                plugin.pcwInput.data('browse-history', history).val('').addClass('span9').removeClass('span10').focus().attr('placeholder', plugin.config.browseText);

                // input now filters the browse results
                // remove our keyup event add filter on keyup. Filter on beginning of term with startsWith.
                plugin.pcwInput.off('keyup.pcwAutoComplete focus.pcwAutoComplete').on('keyup.pcwAutoComplete focus.pcwAutoComplete',function (e) {
                  plugin.pcwAddressBrowse.trigger('show');
                  filter(plugin.pcwAddressBrowse, e, 'startsWith');
                });

                // show back button
                plugin.pcwReturnToSearchBtn.show();

                plugin.pcwAddressSelect.trigger('hide');
                plugin.pcwAddressBrowse.html('');

                // add the results to the browse drop down
                $.each(addresses, function(index, value){
                  var listitem = $('<li></li>');
                  //var listitemlink = $('<a href="#" class="finish">'+value.address+'</a>').data('finish-id',value.node);

                  var css = (value.complete) ? 'finish' : 'browse';
                  var listitemlink = $('<a href="#" class="'+css+'">'+value.address+'</a>').data((value.complete)?'finish-id':'browse-id',value.node);

                  plugin.pcwAddressBrowse.append(listitem.append(listitemlink)).scrollTop(0).trigger('show');

                });

              },
              error: function() { debug('Browse failed',2) },
              timeout: 2000
          });
        } // end function browse


        /*
        *   finish(id)
        *
        *   Get the full address from the service using the NodeID
        */
        function finish(id){

          $.ajax({
             type: 'GET',
              url: constants.finishURL.replace('{{key}}', plugin.config.apikey).replace('{{searchterm}}', plugin.pcwInput.data('search-text')) + id +'&lines='+plugin.config.addresslines+'&exclude='+plugin.config.exclude+'&identifier='+plugin.config.identifier,
              async: false,
              jsonpCallback: plugin.config.jsonCallback,
              contentType: "application/json",
              dataType: 'jsonp',
              success: function(result) {

                plugin.pcwAddressBrowse.hide();
                plugin.pcwAddressSelect.hide();

                if (result.length > 0){

                  plugin.config.processAddress(result[0]);

                }else{

                  plugin.pcwAddressFinish.html('').html('Not found');

                }
              },
              error: function(e) {
                 plugin.pcwAddressFinish.html('').html('Error');
              }
          });


        } // end function finish


        /*
        *   filter(listID, evt, method)
        *
        *   Search the auto complete service
        */
        function filter(list, evt, method){

          if (evt){
            // don't filter if pressing keys to navigate the list
            switch(evt.which){
              case 13:
              case 37:
              case 38:
              case 40:
              case 'undefined':
                evt.preventDefault();
                evt.stopPropagation();
                return false;                
                break;
            }
          }

          if (typeof evt.which == undefined){
            return false;
          }

          var searchstring = plugin.pcwInput.val();

          debug('filtering input: '+searchstring+' using "'+method+'". Last keypress = '+evt.which);

          if(!searchstring) {
            searchstring = '';
          }

          switch (method){
            case 'startsWith':
              var matches = list.find('a:startsWith(' + searchstring + ')').parent();
            break
            default:
              var matches = list.find('a:icontains(' + searchstring + ')').parent();
            break;
          }

          // if one address result, browse it
          if (list == plugin.pcwAddressSelect && matches.length == 1){
            
            // browse result or finish 
            if (matches.find('a').data('browse-id') !== undefined){
              browse(matches.find('a').data('browse-id'));
            }else if (matches.find('a').data('finish-id') !== undefined){
              finish(matches.find('a').data('finish-id'));
            }
            else{
                // error ?
            }

          }

          $('li', list).not(matches).slideUp('fast');

          matches.slideDown('fast');

          return false;
        } // end function filter


        /*
        *   debug(message, output type <optional>)
        *
        *   Display debug messages
        */
        var debug = function (msg, code) {
          if (plugin.config.debug) {
            switch (code) {
              case 1: // proper error                    
                console.error("PCW->" + msg);
                break;
              case 2: // information (writes out objects as strings)
                console.info(msg);
                break;
              case 3: // standard log message
                  console.log("PCW->" + msg);
                break;
              default:
                console.info("PCW->" + msg);
            }
          }
        };


        // fire up the plugin!
        plugin.init();

    }

    // add the plugin to the jQuery.fn object
    $.fn.pcwAutoComplete = function(options) {

        // iterate through the DOM elements we are attaching the plugin to
        return this.each(function() {

            // if plugin has not already been attached to the element
            if (undefined == $(this).data('pcwAutoComplete')) {

                // create a new instance of the plugin
                // pass the DOM element and the user-provided options as arguments
                var plugin = new $.pcwAutoComplete(this, options);

                // in the jQuery version of the element
                // store a reference to the plugin object
                $(this).data('pcwAutoComplete', plugin);

            }

        });

    }

    // case insensitive :icontains selector
    $.expr[':'].icontains = function(obj, index, meta, stack){
        return (obj.textContent || obj.innerText || jQuery(obj).text() || '').toLowerCase().indexOf(meta[3].toLowerCase()) >= 0;
    };
    // case insensitive :startsWith selector
    $.expr[":"].startsWith = function(obj, index, meta, stack) { 
        return (obj.textContent || obj.innerText || jQuery(obj).text() || '').toLowerCase ().indexOf((meta[3] || '').toLowerCase()) == 0;
    };

})(jQuery);