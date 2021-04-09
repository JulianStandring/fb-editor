/**
 * Editable Components
 * ----------------------------------------------------
 * Description:
 * Enhance target elements (components) with editable update/save properties.
 *
 * Requires: jQuery
 * Documentation:
 *
 *
 *     - TODO:
 *       (steven.burnell@digital.justice.gov.uk to add).
 *
 **/


import DOMPurify from 'dompurify';
import marked from 'marked';
import TurndownService from 'turndown';
import { mergeObjects, createElement, safelyActivateFunction, updateHiddenInputOnForm } from './utilities';

var turndownService = new TurndownService();


/* Editable Base:
 * Shared code across the editable component types.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options, e.g.
 *                  {
 *                    editClassname: 'usedOnElementToShowEditing'
 *                    form: $formNodeToAddHiddenInputsForSaveSubmit,
 *                    id: 'identifierStringForUseInHiddenFormInputName',
 *                    type: 'editableContentType'
 *                  }
 **/
class EditableBase {
  constructor($node, config) {
    this._config = config || {};
    this.type = config.type;
    this.$node = $node;
    $node.data("instance", this);

    $node.on("click.editablecomponent focus.editablecomponent", (e) => {
      e.preventDefault();
    });
  }

  get content() {
    return $node.text();
  }

  save() {
    updateHiddenInputOnForm(this._config.form, this._config.id, this.content);
  }
}


/* Editable Element:
 * Used for creating simple content control objects on HTML
 * elements such as <H1>, <P>, <LABEL>, <LI>, etc.
 * Switched into edit mode on focus and out again on blur.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options, e.g.
 *                  {
 *                    onSaveRequired: function() {
 *                      // Pass function to do something. Triggered if
 *                      // the code believes something has changed on
 *                      // an internal 'update' call.
 *                    }
 *                  }
 **/
class EditableElement extends EditableBase {
  constructor($node, config) {
    super($node, config);
    var originalContent = $node.html();

    $node.on("blur.editablecomponent", this.update.bind(this));
    $node.on("focus.editablecomponent", this.edit.bind(this) );
    $node.on("paste.editablecomponent", e => pasteAsPlainText(e) );
    $node.on("keydown.editablecomponent", e => singleLineInputRestrictions(e) );

    $node.attr("contentEditable", true);
    $node.addClass("EditableElement");

    this.originalContent = originalContent;
    this.defaultContent = $node.data(config.attributeDefaultText);
  }

  get content() {
    var content = this.$node.html();
    return content == this.defaultContent ? "" : content;
  }

  set content(content) {
    this.populate(content);
    safelyActivateFunction(this._config.onSaveRequired);
  }

  edit() {
    this.$node.addClass(this._config.editClassname);
  }

  update() {
    this.content = this.$node.text();
    this.$node.removeClass(this._config.editClassname);
  }

  // Expects HTML or blank string to show HTML or default text in view.
  populate(content) {
    var defaultContent = this.defaultContent || this.originalContent;
    this.$node.html(content.trim() == "" ? defaultContent : content);
  }

  focus() {
    this.$node.focus();
  }
}


/* Editable Content:
 * Used for creating complex content control objects on HTML areas such as a <DIV>,
 * or <article>. The content will, when in edit mode, convert to Markdown and expect
 * user input in as Markdown. On exit of edit mode visible content will be translated
 * back into HTML for non-edit view and to save.
 * (Edit mode controlled by focus and blur events).
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options.
 **/
class EditableContent extends EditableElement {
  constructor($node, config) {
    super($node, config);
    this._editing = false;
    this._html = $node.html();

    // Adjust event for multiple line input.
    $node.off("keydown.editablecomponent");
    $node.on("keydown.editablecontent", e => multipleLineInputRestrictions(e) );

    // Correct the class:
    $node.removeClass("EditableElement");
    $node.addClass("EditableContent");
  }

  // Get content must always return Markdown because that's what we save.
  get content() {
    var content = convertToMarkdown(this._html);
    var value = "";
    if(this._config.data) {
      this._config.data.content = content;
      value = JSON.stringify(this._config.data);
    }
    else {
      value = (content.replace(/\s/mig, "") == this.defaultContent ? "" : content);
    }
    return value;
  }

  // Set content takes markdown (because it should be called after editing).
  // It should convert the markdown to HTML and put back as DOM node content.
  set content(markdown) {
    var markdown = sanitiseMarkdown(markdown);
    var html = convertToHtml(markdown);
    this._html = html;
    this.populate(html);
    safelyActivateFunction(this._config.onSaveRequired);
  }

  edit() {
    if(!this._editing) {
      this.$node.html(this.markdown()); // Show as markdown in edit mode.
      this._editing = true;
      super.edit();
    }
  }

  update() {
    if(this._editing) {
      this.content = this.$node.html(); // Converts markdown back to HTML.
      this.$node.removeClass(this._config.editClassname);
      this._editing = false;
    }
  }

  // Returns $node.html() converted to markdown.
  markdown() {
    var markdown = convertToMarkdown(this._html);
    return markdown;
  }
}


/* Editable Component Base:
 * Share code across the editable component types.
 * Those types are comprised of one or more elements and
 * produce a JSON string as content from internal data object.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options.
 * @elements (Object) Collection of EditableElement instances found in the component.
 *
 **/
class EditableComponentBase extends EditableBase {
  constructor($node, config, elements) {
    super($node, config);
    this.data = config.data;
    $node.data("instance", this);

    // e.g. elements = {
    //        something: new EditableElement($node.find("something"), config)
    //        and any others...
    //      }
    this._elements = arguments.length > 2 && elements || {
      label: new EditableElement($node.find(config.selectorQuestion), config),
      hint: new EditableElement($node.find(config.selectorHint), config)
    };

    $node.find(config.selectorDisabled).attr("disabled", true); // Prevent input in editor mode.
  }

  get content() {
    return JSON.stringify(this.data);
  }

  set content(elements) {
    // Expect this function to be overridden for each different type inheriting it.
    // e.g.
    // this.data.something = elements.something.content
    this.data.label = elements.label.content;
    this.data.hint = elements.hint.content;
  }

  save() {
    // e.g.
    // this.data.something = this._elements.something.content;
    this.content = this._elements;
    EditableBase.prototype.save.call(this);
  }

  // Focus on first editable element.
  focus() {
    for(var i in this._elements) {
      if(this._elements.hasOwnProperty(i)) {
        this._elements[i].focus();
        break;
      }
    }
  }
}


/* Editable Text Field Component:
 * Structured editable component comprising of one or more elements.
 * Produces a JSON string as content from internal data object.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options.
 *
 *
 * Expected backend structure  (passed as JSON)
 * --------------------------------------------
 *  _id: single-question_text_1
 *  hint: Component hint
 *  name: single-question_text_1
 *  _type: text
 *  label: Component label
 *  errors: {}
 *  validation:
 *    required: true
 *
 * Expected (minimum) frontend struture
 * ------------------------------------
 * <div class="fb-editable" data-fb-content-id="foo" data-fb-content-type="text" data-fb-conent-data=" ...JSON... ">
 *   <label>Component label</label>
 *   <span>Component hint</span>
 *   <input name="answers[single-question_text_1]" type="text">
 * </div>
 **/
class EditableTextFieldComponent extends EditableComponentBase {
  constructor($node, config) {
    // TODO: Potential future addition...
    //       Maybe make this EditableAttribute instance when class is
    //       ready so we can edit attribute values, such as placeholder.
    //  {input: new EditableAttribute($node.find("input"), config)}
    super($node, config);
    $node.addClass("EditableTextFieldComponent");
  }
}


/* Editable Textarea Field Component:
 * Structured editable component comprising of one or more elements.
 * Produces a JSON string as content from internal data object.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options.
 *
 *
 * Expected backend structure  (passed as JSON)
 * --------------------------------------------
 *  _id: single-question_textarea_1
 *  hint: Component hint
 *  name: single-question_textarea_1
 *  _type: text
 *  label: Component label
 *  errors: {}
 *  validation:
 *    required: true
 *
 * Expected (minimum) frontend struture
 * ------------------------------------
 * <div class="fb-editable" data-fb-content-id="foo" data-fb-content-type="text" data-fb-conent-data=" ...JSON... ">
 *   <label>Component label</label>
 *   <span>Component hint</span>
 *   <textarea name="answers[single-question_textarea_1]"></textarea>
 * </div>
 **/
class EditableTextareaFieldComponent extends EditableComponentBase {
  constructor($node, config) {
    super($node, config);
    $node.addClass("EditableTextareaFieldComponent");
  }
}


/* Editable Group Field Component:
 * Structured editable component comprising of one or more fields wrapped in fieldset.
 * Produces a JSON string as content from internal data object.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options.
 *
 *
 * Example expected backend structure  (passed as JSON - using a Date component)
 * -----------------------------------------------------------------------------
 *  _id: Date_date_1
 *  hint: Component hint
 *  name: Date_date_1
 *  _type: date
 *  label: Component label
 *  errors: {}
 *  validation:
 *    required: true
 *
 * Expected (minimum) frontend struture
 * ------------------------------------
 * <div class="fb-editable" data-fb-content-id="foo" data-fb-content-type="date" data-fb-conent-data=" ...JSON... ">
 *   <fieldset>
 *     <legend>Question text</legend>
 *
 *     <label>Day</label>
 *     <input name="answers[date_1]" type="text" />
 *
 *     <label>Month</label>
 *     <input name="answers[date_2]" type="text" />
 *
 *     <label>Year</label>
 *     <input name="answers[date_3]" type="text" />
 *   </fieldset>
 * </div>
 **/
class EditableGroupFieldComponent extends EditableComponentBase {
  constructor($node, config) {
    super($node, config, {
      label: new EditableElement($node.find(config.selectorGroupQuestion), config),
      hint: new EditableElement($node.find(config.selectorHint), config)
    });
    $node.addClass("EditableGroupFieldComponent");
  }

  // Override get/set content only because we need to use data.legend instead of data.label
  get content() {
    return JSON.stringify(this.data);
  }

  set content(elements) {
    this.data.legend = elements.label.content;
    this.data.hint = elements.hint.content;
  }
}


/* Editable Collection (Radios/Checkboxes) Field Component:
 * Structured editable component comprising of one or more elements.
 * Produces a JSON string as content from internal data object.
 *
 * @$node  (jQuery object) jQuery wrapped HTML node.
 * @config (Object) Configurable options.
 *
 *
 * Expected backend structure  (passed as JSON)
 * --------------------------------------------
 *  _id: collections_1,
 *  hint: Hint text,
 *  name: collections_1,
 *  _type : [radios|checkboxes],
 *  items: [
 *    {
 *      _id: component_item_1,
 *      hint: Hint text,
 *      _type: [radio|checkbox],
 *      label: Label Text,
 *      value: value-1
 *    },{
 *     _id: component_item_2,
 *      hint: Hint text,
 *      _type: [radio|checkbox],
 *      label: Label text,
 *      value: value-2
 *    }
 *  ],
 *  errors: {},
 *  legend: Question,
 *  validation: {
 *    required: true
 *  }
 *
 *
 * Expected (minimum) frontend structure
 * -------------------------------------
 * <div class="fb-editable" data-fb-content-id="foo" data-fb-content-type="radios" data-fb-conent-data=" ...JSON... ">
 *   <fieldset>
 *     <legend>Question</legend>
 *
 *     <input name="answers[single-question_radio_1]" type="radio" />
 *     <label>Component label</label>
 *     <span>Component hint</span>
 *
 *     <input name="answers[single-question_radio_1]" type="radio" />
 *     <label>Component label</label>
 *     <span>Component hint</span>
 *
 * </div>
 **/
class EditableCollectionFieldComponent extends EditableComponentBase {
  constructor($node, config) {
    super($node, config, {
      // Be better for consistency if this was 'label' and not 'legend',
      // but working with the JSON recognised by/sent from the  server.
      label: new EditableElement($node.find(config.selectorCollectionQuestion), config),
      hint: new EditableElement($node.find(config.selectorCollectionHint), config)
    });

    //var text = JSON.parse(config.text || "{}");
    this._preservedItemCount = (this.type == "radios" ? 2 : 1); // Either minimum 2 radios or 1 checkbox.
    EditableCollectionFieldComponent.createCollectionItemTemplate.call(this, config);
    EditableCollectionFieldComponent.createEditableCollectionItems.call(this, config);
    new EditableCollectionItemInjector(this, config);
    $node.addClass("EditableCollectionFieldComponent");
  }

  // If we override the set content, we obliterate relationship with the inherited get content.
  // This will retain the inherit functionality by explicitly calling it.
  get content() {
    return super.content;
  }

  set content(elements) {
    this.data.legend = elements.label.content;
    this.data.hint = elements.hint.content;

    // Set data from items.
    this.data.items = [];
    for(var i=0; i< this.items.length; ++i) {
      this.data.items.push(this.items[i].data);
    }
  }

  // Dynamically adds an item to the components collection
  add() {
    // Component should always have at least one item, otherwise something is very wrong.
    var $lastItem = this.items[this.items.length - 1].$node;
    var $clone = this.$itemTemplate.clone();
    $lastItem.after($clone);
    EditableCollectionFieldComponent.addItem.call(this, $clone, this.$itemTemplate.data("config"));
    EditableCollectionFieldComponent.updateItems.call(this);
    safelyActivateFunction(this._config.onItemAdd, $clone);
    safelyActivateFunction(this._config.onSaveRequired);
  }

  // Dynamically removes an item to the components collection
  remove(item) {
    var index = this.items.indexOf(item);
    safelyActivateFunction(this._config.onItemRemove, item);
    this.items.splice(index, 1);
    item.$node.remove();
    EditableCollectionFieldComponent.updateItems.call(this);
    safelyActivateFunction(this._config.onSaveRequired);
  }

  save() {
    // Trigger the save action on items before calling it's own.
    for(var i=0; i<this.items.length; ++i) {
      this.items[i].save();
    }
    super.save();
  }
}

/* Private function
 * Create an item template which can be cloned in component.add()
 * config (Object) key/value pairs for extra information.
 *
 * Note: Initial index elements of Array/Collection is called directly
 * without any checking for existence. This is because they should always
 * exist and, if they do not, we want the script to throw an error
 * because it would alert us to something very wrong.
 **/
EditableCollectionFieldComponent.createCollectionItemTemplate = function(config) {
  var $item = this.$node.find(config.selectorCollectionItem).eq(0);
  var data = mergeObjects({}, config.data, ["items"]); // pt.1 Copy without items.
  var itemConfig = mergeObjects({}, config, ["data"]); // pt.2 Copy without data.
  itemConfig.data = mergeObjects(data, config.data.items[0]); // Bug fix response to JS reference handling.

  // Filters could be changing the blah_1 values to blah_0, depending on filters in play.
  itemConfig.data = EditableCollectionFieldComponent.applyFilters(config.filters, 0, itemConfig.data);
  $item.data("config", itemConfig);

  // Note: If we need to strip out some attributes or alter the template
  //       in some way, do that here.

  this.$itemTemplate = $item;
}

/* Private function
 * Find radio or checkbox items and enhance with editable functionality.
 * Creates the initialising values for this.items
 * config (Object) key/value pairs for extra information.
 **/
EditableCollectionFieldComponent.createEditableCollectionItems = function(config) {
  var component = this;
  component.$node.find(config.selectorCollectionItem).each(function(i) {
    var data = mergeObjects({}, config.data, ["items"]); // pt.1 Copy without items.
    var itemConfig = mergeObjects({ preserveItem: (i < component._preservedItemCount) }, config, ["data"]); // pt.2 Without data
    itemConfig.data = mergeObjects(data, config.data.items[i]); // Bug fix response to JS reference handling.

    // Only wrap in EditableComponentCollectionItem functionality if doesn't look like it has it.
    if(this.className.indexOf("EditableComponentCollectionItem") < 0) {
      EditableCollectionFieldComponent.addItem.call(component, $(this), itemConfig);
    }
  });
}

/* Private function
 * Enhance an item and add to this.items array.
 * $node (jQuery node) Should be a clone of this.itemTemplate
 * config (Object) key/value pairs for extra information.
 **/
EditableCollectionFieldComponent.addItem = function($node, config) {
  if(!this.items) { this.items = []; } // Should be true on first call only.
  this.items.push(new EditableComponentCollectionItem(this, $node, config));

  // TODO: need to update the data on each item so _id and value are different.
  
}

/* Private function
 * Run through the collection items to make sure data is sync'd when we've
 * either added a new item or removed one (e.g. makes sure to avoid clash
 * of data _id values.
 **/
EditableCollectionFieldComponent.updateItems = function() {
  var filters = this._config.filters;
  for(var i=0; i < this.items.length; ++i) {
    this.items[i].data = EditableCollectionFieldComponent.applyFilters(filters, i+1, this.items[i].data);
  }
}


/* Private function
 * Applies config.filters to the data passed in, with an index number, since this should
 * be called within a loop of the items. It has been expracted out to counter complications
 * running into closure issues due to manipulating data within a loop.
 * @unique (Integer|String) Should be current loop number, or at least something unique. 
 * @data   (Object) Collection item data.
 **/
EditableCollectionFieldComponent.applyFilters = function(filters, unique, data) {
  var filtered_data = {};
  for(var prop in data) {
    if(filters && filters.hasOwnProperty(prop)) {
      filtered_data[prop] = filters[prop].call(data[prop], unique);
    }
    else {
      filtered_data[prop] = data[prop];
    }
  }
  return filtered_data;
}

/* Editable Component Collection Item:
 * Used for things like Radio Options/Checkboxes that have a label and hint element
 * but are owned by a parent Editable Component, so does not need to save their
 * own content by writing a hidden element (like other types). Not considered
 * a standalone 'type' to be used in the editableComponent() initialisation
 * function.
 *
 * Save function will produce a JSON string as content from internal data object
 * but do nothing else with it. A parent component will read and use the
 * generated 'saved' content.
 *
 * config.onItemRemoveConfirmation (Function) An action passed the item.
 *
 **/
class EditableComponentCollectionItem extends EditableComponentBase {
  constructor(editableCollectionFieldComponent, $node, config) {
    super($node, config);

    if(!config.preserveItem) {
      new EditableCollectionItemRemover(this, editableCollectionFieldComponent, config);
    }

    $node.on("focus.EditableComponentCollectionItem", "*", function() {
      $node.addClass(config.editClassname);
    });

    $node.on("blur.EditableComponentCollectionItem", "*", function() {
      $node.removeClass(config.editClassname);
    });

    this.component = editableCollectionFieldComponent;
    $node.addClass("EditableComponentCollectionItem");
  }

  remove() {
    if(this._config.onItemRemoveConfirmation) {
      // If we have confirgured a way to confirm first...
      safelyActivateFunction(this._config.onItemRemoveConfirmation, this);
    }
    else {
      // or just run the remove function.
      this.component.remove(this);
    }
  }

  save() {
    // Doesn't need super because we're not writing to hidden input.
    this.content = this._elements;
  }
}


class EditableCollectionItemInjector {
  constructor(editableCollectionFieldComponent, config) {
    var conf = mergeObjects({}, config);
    var text = mergeObjects({ addItem: 'add' }, config.text);
    var $node = $(createElement("button", text.addItem, conf.classes));
    editableCollectionFieldComponent.$node.append($node);
    $node.addClass("EditableCollectionItemInjector")
    $node.data("instance", this);
    $node.on("click", function(e) {
      e.preventDefault();
      editableCollectionFieldComponent.add();
    });

    this.component = editableCollectionFieldComponent;
    this.$node = $node;
  }
}


class EditableCollectionItemRemover {
  constructor(editableCollectionItem, editableCollectionFieldComponent, config) {
    var conf = mergeObjects({}, config);
    var text = mergeObjects({ removeItem: 'remove' }, config.text);
    var $node = $(createElement("button", text.removeItem, conf.classes));
    var removeCollectionItem = function() {
      editableCollectionFieldComponent.remove(editableCollectionItem);
    }

    $node.data("instance", this);
    $node.addClass("EditableCollectionItemRemover");
    $node.on("click.EditableCollectionItemRemover", function(e) {
      e.preventDefault();
      editableCollectionItem.remove();
    });

    // Close on SPACE and ENTER
    $node.on("keydown.EditableCollectionItemRemover", function(e) {
      e.preventDefault();
      if(e.which == 13 || e.which == 32) {
        editableCollectionItem.remove();
      }
    });

    editableCollectionItem.$node.append($node);

    this.component = editableCollectionFieldComponent;
    this.item = editableCollectionItem;
    this.$node = $node;
  }
}


/* Convert HTML to Markdown by tapping into third-party code.
 * Includes clean up of HTML by stripping attributes and unwanted trailing spaces.
 **/
function convertToMarkdown(html) {
  html = html.trim();
  html = html.replace(/(<\w[\w\d]+)\s*[\w\d\s=\"-]*?(>)/mig, "$1$2");
  html = html.replace(/(?:\n\s*)/mig, "\n");
  html = html.replace(/[ ]{2,}/mig, " ");
  html = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }});
  return turndownService.turndown(html);
}


/* Convert Markdown to HTML by tapping into a third-party code.
 **/
function convertToHtml(markdown) {
  return marked(sanitiseMarkdown(markdown));
}

/* Manual conversion of characters to keep values as required.
 * Stripping the <br> tags is because we put them in for visual formatting only.
 * Stripping out the extra spaces because the browser added them and we don't want.
 * Seems like the browser (contentEditable functionality) is adding <div> tags to
 * format new lines, so we're fixing that with line-breaks and stripping excess.
 **/
function sanitiseMarkdown(markdown) {
  markdown = markdown.replace(/\*\s+/mig, "* "); // Make sure only one space after an asterisk
  markdown = markdown.replace(/<br>/mig, "\n");
  markdown = markdown.replace(/<\/div><div>/mig, "\n");
  markdown = markdown.replace(/<[\/]?div>/mig, "");
  return markdown;
}


/* Multiple Line Input Restrictions
 * Browser contentEditable mode means some pain in trying to prevent
 * HTML being inserted (rich text attempts by browser). We're only
 * editing as plain text and markdown for all elements so try to
 * prevent unwanted entry with this function.
 **/
function multipleLineInputRestrictions(event) {

  // Prevent ENTER adding <div><br></div> nonsense.
  if(event.which == 13) {
    event.preventDefault();
    document.execCommand("insertText", false, "\n");
  }
}


/* Single Line Input Restrictions
 *Browser contentEditable mode means some pain in trying to prevent
 * HTML being inserted (rich text attempts by browser). We're only
 * editing as plain text and markdown for all elements so try to
 * prevent unwanted entry with this function.
 **/
function singleLineInputRestrictions(event) {

  // Prevent ENTER adding <div><br></div> nonsense.
  if(event.which == 13) {
    event.preventDefault();
  }
}

/* Function prevents rich text being pasted on paste event.
 * Used in the editing markdown area so we do not get crossed
 * formats.
 *
 * Use like: $('something').on('paste', e => pasteAsPlainText(e) )}
 **/
function pasteAsPlainText(event) {
  event.preventDefault();
  var content = "";
  if (event.clipboardData || event.originalEvent.clipboardData) {
    content = (event.originalEvent || event).clipboardData.getData('text/plain');
  }
  else {
    if (window.clipboardData) {
      content = window.clipboardData.getData('Text');
    }
  }

  if (document.queryCommandSupported("insertText")) {
    document.execCommand("insertText", false, content);
  }
  else {
    document.execCommand("paste", false, content);
  }
}


/* Determin what type of node is passed and create editable content type
 * to match.
 *
 * @$node ($jQuery node) REQUIRED - jQuery wrapped HTML element to become editable content.
 * @config (Object) Properties passed for any configuration.
 **/
function editableComponent($node, config) {
  var klass;
  switch(config.type) {
    case "element":
      klass = EditableElement;
      break;
    case "content":
      klass = EditableContent;
      break;
    case "text":
    case "number":
      klass = EditableTextFieldComponent;
      break;
    case "textarea":
      klass = EditableTextareaFieldComponent;
      break;
    case "date":
      klass = EditableGroupFieldComponent;
      break;
    case "radios":
    case "checkboxes":
      klass = EditableCollectionFieldComponent;
      break;
  }
  return new klass($node, config);
}


// Make available for importing.
export { editableComponent };
