(function($) {

    $.logiform = function(element, options) {
        var defaults = {
            'hide_original': true,
            'data': '{"$and":[]}',
            'operators': {
                'logical': [
                    {'expression': '$and', 'description': 'AND'},
                    {'expression': '$or', 'description': 'OR'},
                    {'expression': '|'},
                    {'expression': '$nor', 'description': 'NOR'}
                ],
                'comparison': [
                    {'expression': '$eq', 'description': '= Equal'},
                    {'expression': '$ne', 'description': '!= Not equal'},
                    {'expression': '|'},
                    {'expression': '$gt', 'description': '> Greater than'},
                    {'expression': '$gte', 'description': '>= Greater than or equal'},
                    {'expression': '$lt', 'description': '< Less than'},
                    {'expression': '$lte', 'description': '<= Less than or equal'},
                    {'expression': '|'},
                    {'expression': '$in', 'description': 'Match in array'},
                    {'expression': '$nin', 'description': 'No match in array'}
                ]
            }
        };

        var logiform = this;
        logiform.settings = {}

        var condition_group_mockup;
        var condition_group;
        var fieldValueMockup = {};

        var $element = $(element),
             element = element;

        logiform.init = function() {
            logiform.settings = $.extend({}, defaults, options);

            // Prepare content
            var divider = '<option data-divider="true">----</option>';

            // Prepare logical operators
            var logicalOperatorItems = ''
            for (var i = 0, sz = logiform.settings.operators.logical.length; i < sz; i++) {
                item = logiform.settings.operators.logical[i];

                if (item.expression == '|') {
                    logicalOperatorItems += divider;
                } else {
                    logicalOperatorItems += '<option value="'+item['expression']+'">'+item['description']+'</option>';
                }
            }
            var logicalOperatorContent = 
                '<select class="lf-logicaloperator selectpicker">' +
                logicalOperatorItems +
                '</select>';

            // Prepare comparison operators
            var comparisonOperatorItems = ''
            for (var i = 0, sz = logiform.settings.operators.comparison.length; i < sz; i++) {
                item = logiform.settings.operators.comparison[i];

                if (item.expression == '|') {
                    comparisonOperatorItems += divider
                } else {
                    comparisonOperatorItems += '<option value="'+item['expression']+'">'+item['description']+'</option>';
                }
            }
            var comparisonOperatorContent = 
                '<select class="lf-comparisonoperator selectpicker">' +
                comparisonOperatorItems +
                '</select>';

            // Prepare field items and its mockup element for value.
            var firstFieldValueMockup = '';
            var fieldItems = '';
            for (var i = 0, sz = logiform.settings.schema.length; i < sz; i++) {
                item = logiform.settings.schema[i];

                if (item.id == '|') {
                    fieldItems += divider
                } else {
                    fieldItems += '<option value="'+item['id']+'">'+item['description']+'</option>';

                    // TODO: Create a suitable mockup for each field type
                    if (item['type'] == 'array') {
                        var candidates = '';
                        for (var idxOption = 0, szOption = item['candidates'].length; idxOption < szOption; idxOption++) {
                            var option = item['candidates'][idxOption];
                            if (option instanceof Array) {
                                candidates += '<option value="'+option[0]+'">'+option[1]+'</option>';
                            } else {
                                candidates += '<option value="'+option+'">'+option+'</option>';
                            }
                        }
                        fieldValueMockup[item['id']] = '<select class="lf-value">'+candidates+'</select>';
                    } else {
                        fieldValueMockup[item['id']] = '<input class="lf-value" type="text">';
                    }

                    if (firstFieldValueMockup == '') {
                        firstFieldValueMockup = fieldValueMockup[item['id']];
                    }
                }
            }
            var fieldContent = 
                '<select class="lf-field selectpicker">' +
                fieldItems +
                '</select>';

            // Create a mockup for condition
            condition_mockup = 
                '<div class="lf-condition">' +
                    fieldContent +
                    comparisonOperatorContent + 
                    '<div class="lf-condition-value">' +
                    firstFieldValueMockup +
                    '</div>' +
                    '<button type="button" class="lf-button-remove-condition">Remove</button>' +
                '</div>';

            // Create a mockup for condition group
            condition_group_mockup = 
                '<div class="lf-condition-group">' +
                    logicalOperatorContent +
                    '<button type="button" class="lf-button-remove-condition-group">Remove</button>' +
                    '<div class="lf-condition-list">' +
                    '</div>' +
                    '<div class="lf-buttons">' +
                        '<button type="button" class="lf-button-add-condition">Add condition</button>' +
                        '<button type="button" class="lf-button-add-condition-group">Add condition group</button>' +
                    '</div>' +
                '</div>';

            // Create root
            var root = $(condition_group_mockup).attr('id', 'lf-root');
            root.find('.lf-button-remove-condition-group').attr('disabled', 'disabled');

            // Set up handlers
            root.on('click', '.lf-button-add-condition', function() {
                $(this).parents('.lf-condition-group:first').find('.lf-condition-list:first').append($(condition_mockup));
                logiform.bake(root);
            });
            root.on('click', '.lf-button-add-condition-group', function() {
                $(this).parents('.lf-condition-group:first').find('.lf-condition-list:first').append($(condition_group_mockup));
                logiform.bake(root);
            });
            root.on('click', '.lf-button-remove-condition', function() {
                $(this).parents('.lf-condition:first').remove();
                logiform.bake(root);
            });
            root.on('click', '.lf-button-remove-condition-group', function() {
                var group = $(this).parents('.lf-condition-group:first');
                // Do not remove root element
                if (group.attr('id') == 'lf-root') return;
                group.remove();
                logiform.bake(root);
            });
            root.on('change', '.lf-field', function() {
                $(this).siblings('.lf-condition-value').html(fieldValueMockup[$(this).val()]);
                logiform.bake(root);
            });
            root.on('change', '.lf-comparisonoperator, .lf-logicaloperator, .lf-value', function() {
                logiform.bake(root);
            });

            // Parse data if exists
            if (logiform.settings.data) {
                logiform.parse(JSON.parse(logiform.settings.data), root);
            }

            // Hide source
            if (logiform.settings.hide_original) {
                $element.hide();
            }

            // Append to parent
            $element.after(root);

        }

        logiform.parse = function(tree, node) {
            // Traversing condition tree
            for (var logicalOperator in tree) {

                // Set logical operator
                for (var l = 0, szl = logiform.settings.operators.logical.length; l < szl; l++) {
                    item = logiform.settings.operators.logical[l];
                    if (item['expression'] == logicalOperator) {
                        node.find('.lf-logicaloperator').val(logicalOperator);
                        break;
                    }
                }

                // Add conditions
                var conditions = node.find('.lf-condition-list');
                for (var i = 0, sz = tree[logicalOperator].length; i < sz; i++) {
                    condition = tree[logicalOperator][i];

                    for (var field in condition) {

                        // Check whether field name is in scheme,
                        for (var s = 0, szs = logiform.settings.schema.length; s < szs; s++) {
                            item = logiform.settings.schema[s];

                            if (item['id'] == field) {
                                // Create condition and append to list
                                var condition_node = $(condition_mockup);
                                condition_node.find('.lf-field').val(field);
                                condition_node.find('.lf-condition-value').html(fieldValueMockup[field]);
                                conditions.append(condition_node);

                                // Set value for it
                                for (var comparisonOperator in condition[field]) {
                                    var value = condition[field][comparisonOperator];
                                    condition_node.find('.lf-comparisonoperator').val(comparisonOperator);
                                    // TODO: Multiple select box
                                    condition_node.find('.lf-value').val(value);
                                }
                                // Break here, only one value per a statement.
                                break;
                            }
                        }

                        // ...or, this is a nested condition group.
                        for (var l = 0, szl = logiform.settings.operators.logical.length; l < szl; l++) {
                            item = logiform.settings.operators.logical[l];

                            if (item['expression'] == field) {
                                // Create condition group and append to list
                                var condition_group_node = $(condition_group_mockup);

                                // Initiate condition group
                                logiform.parse(condition, condition_group_node);

                                conditions.append(condition_group_node);
                            }
                        }
                        // Break here, only one statement per a condition.
                        break;
                    }
                }
                // Break here, only one logical opeartor per a group.
                break;
            }

        }

        logiform._traverse_parse = function(node) {
        }

        logiform.bake = function(node) {
            // Traversing condition tree
            $element.val(JSON.stringify(logiform._traverse_bake(node)));
        }

        logiform._traverse_bake = function(node) {
            var form = {};
            var logicalOperator = node.children('.lf-logicaloperator:first').val();
            var conditions = [];
            node.children('.lf-condition-list').children().each(function() {
                var cond = $(this);

                if (cond.hasClass('lf-condition-group')) {
                    conditions.push(logiform._traverse_bake(cond));
                } else if (cond.hasClass('lf-condition')) {
                    var field = cond.find('.lf-field').val();
                    var comparisonOperator = cond.find('.lf-comparisonoperator').val();
                    var value = cond.find('.lf-value').val();
                    var s = '{"'+field+'":{"'+comparisonOperator+'":"'+value+'"}}';
                    conditions.push(JSON.parse(s));
                }
            });
            form[logicalOperator] = conditions;
            return form;
        }

        logiform.init();
    }

    $.fn.logiform = function(options) {
        return this.each(function() {
            if (undefined == $(this).data('logiform')) {
                var logiform = new $.logiform(this, options);
                $(this).data('logiform', logiform);
            }
        });
    }
}(jQuery));
