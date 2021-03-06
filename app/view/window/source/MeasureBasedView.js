/**
 *  Edirom Online
 *  Copyright (C) 2011 The Edirom Project
 *  http://www.edirom.de
 *
 *  Edirom Online is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Edirom Online is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Edirom Online.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
Ext.define('de.edirom.online.view.window.source.MeasureBasedView', {
    extend: 'Ext.panel.Panel',
    
    mixins: {
        observable: 'Ext.util.Observable'
    },

    requires: [
        'de.edirom.online.view.window.image.ImageViewer',
        'Ext.selection.CheckboxModel'
    ],
    
    alias : 'widget.measureBasedView',

    layout: {
        type: 'vbox',
        align: 'stretch'
    },

    border: 0,
    
    initComponent: function () {

        var me = this;

        me.addEvents('mdivSelected');

        this.items = [
        ];

        me.viewers = new Ext.util.MixedCollection();

        this.callParent();
    },
    
    getUri: function() {
        return this.owner.uri;
    },
    
    createToolbarEntries: function() {

        var me = this;

        me.mdivSelector = Ext.create('Ext.form.ComboBox', {
            store: Ext.create('Ext.data.Store', {
                    fields: ['id', 'name'],
                    data: [],
                    storeId: 'mdiv_store_' + me.id
                }),
            queryMode: 'local',
            displayField: 'name',
            valueField: 'id',
            margin: '0 0 0 0',
            id: 'mdiv_combo_' + me.id,
            hidden: true,
            listeners:{
                scope: me,
                'select': me.setMdiv
            }
        });

        me.pageSpinner = Ext.create('de.edirom.online.view.window.source.MeasureSpinner', {
            width: 139, //bwb-2018
            cls: 'measureSpinner', //bwb-2018 was pageSpinner
            owner: me//,
            //hidden: true //bwb-2018
        });
        
        me.intervalSpinner = Ext.create('de.edirom.online.view.window.source.IntervalSpinner', {
            value: 1,
            maxValue: 99,
            minValue: 1,
            hideLabel: true,
            hidden: true
        });
        
        me.intervalSpinner.on('change', me.measureSpinner.onIntervalChange, me.measureSpinner);
        
        me.voiceFilter = Ext.create('Ext.button.Button', {
            handler: function() {
                me.showVoiceFilterDialog();
            },
            cls : 'voiceFilter toolButton',
            tooltip: { text: getLangString('view.window.source.SourceView_MeasureBasedView_selectVoices'), align: 'bl-tl' },
            margin: '0 0 0 5',
            disabled: true,
            hidden: true
        });
        
        var settingsContainer = Ext.create('Ext.container.Container', {
            layout: 'hbox'
        });
        settingsContainer.add(me.voiceFilter);
        
        me.separator1 = Ext.create('Ext.toolbar.Separator', {hidden: true});
        me.separator2 = Ext.create('Ext.toolbar.Separator', {hidden: true});
        
        return [me.mdivSelector, me.separator1, me.measureSpinner, me.intervalSpinner, me.separator2, settingsContainer];
    },
    
    fitFacsimile: function() {
        var me = this;
        me.setMeasure(me.measureSpinner.combo, me.measureSpinner.combo.getStore());
    },
    
    hideToolbarEntries: function() {
        var me = this;
        me.mdivSelector.hide();
        me.measureSpinner.hide();
        me.intervalSpinner.hide();
        me.voiceFilter.hide();
        me.separator1.hide();
        me.separator2.hide();
    },
    
    showToolbarEntries: function() {
        var me = this;
        me.mdivSelector.show();
        me.measureSpinner.show();
        me.intervalSpinner.show();
        me.voiceFilter.show();
        me.separator1.show();
        me.separator2.show();
    },

    setMdiv: function(combo, records, eOpts) {
        var me = this;
        
        if(me.mdivSelected == combo.getValue()) return;
        
        me.mdivSelected = combo.getValue();
        me.fireEvent('mdivSelected', me.mdivSelected, me);
    },

    setMovements: function(movements) {
        var me = this;
        me.movements = movements;
        
        var data = [];
        movements.data.each(function(elem) {
            data.push(elem.data);
        });
        me.mdivSelector.getStore().loadData(data);
        
        if(me.owner.window.internalIdType != 'measure')
            me.mdivSelector.setValue(data[0]['id']);
    },

    setMeasures: function(measures) {
        var me = this;
        me.measures = measures;
        me.measureSpinner.setStore(me.measures);

/*        if(me.imageToShow != null) {
            me.pageSpinner.setPage(me.imageSet.getById(me.imageToShow));
            me.imageToShow = null;

        }else if(me.imageSet.getCount() > 0)
        */
            me.measureSpinner.setMeasure(me.measures.getAt(0));
    },
    
    showMeasure: function(movementId, measureId, measureCount) {
        var me = this;
        
        if(me.mdivSelector.getValue() != movementId) {
            me.mdivSelector.setValue(movementId);
            me.setMdiv(me.mdivSelector);
        }
        
        if(typeof me.measures == 'undefined' || me.measures == null || me.measures.getById(measureId) == null) {
            Ext.defer(me.showMeasure, 300, me, [movementId, measureId, measureCount], false);
            return;
        }
        
        me.measureSpinner.setMeasure(me.measures.getById(measureId), measureCount);
    },
    
    setMeasure: function(combo, store, measureCount) {

        var me = this;
        /* nbeer
        var measureCount = (typeof measureCount === 'number') ? measureCount : 1;
                console.log(measureCount);
                console.log(typeof measureCount);
        */
        if(typeof store.getById !== 'function')
            store = combo.store;

        me.viewers.each(function(v) {
            v.hide();
        });

        var id = combo.getValue();
        var measures = store.getById(id);
        /* nbeer
        var distinctVoices = [];
        console.log(distinctVoices);
        */
        /*var distinctVoices = [], output = [], l = measures.measures.length, i;
        for( i=0; i<l; i++) {
            if( distinctVoices[measures.measures[i].voice]) continue;
            distinctVoices[measures.measures[i].voice] = true;
            output.push(measures.measures[i].voice);
            };*/
        Ext.Array.each(measures.get('measures'), function(m) {
            
            var voice = m['voice'];
            var partLabel = m['partLabel'];
            
            /* nbeer
                var counts = Ext.Array.filter(measures.get('measures'), function(m) {
                return m['voice'] == voice;
            }).length;
                Ext.Array.each(measures.get('measures'), function(x) {
                    if (x['voice'] == voice) {counts++};
                });
                distinctVoices[voice] = counts;
                
        });
        
        Ext.Array.each(Object.keys(distinctVoices), function(key) {
        
            var voice = key;
            var count = distinctVoices[key];
            var measureCountModifier = count - 1;
            var m = Ext.Array.filter(measures.get('measures'), function(m) {
                return m['voice'] == key;
            })[0];
            console.log(voice);
            if(voice == 'score' || me.parts.getById(voice).get('selected')) {
                
           */     
                
            if(voice == 'score' || me.parts.getById(voice.substr(1)).get('selected')) {
                var viewer = me.viewers.get(voice);
                
                if(typeof viewer == 'undefined') {
                    viewer = Ext.create('de.edirom.online.view.window.source.HorizontalMeasureViewer', {
                        owner: me,
                        partLabel: partLabel
                    });
                    
                    me.viewers.add(voice, viewer);
                    me.add(viewer);
                }
                /* nbeer */
                //viewer.setMeasure(m, measureCount + measureCountModifier);
                viewer.show();
                
            }
        });
        /* nbeer */
        Ext.Array.each(measures.get('measures'), function(m) {
            
            var voice = m['voice'];
            
            if(voice == 'score' || me.parts.getById(voice.substr(1)).get('selected')) {
                var viewer = me.viewers.get(voice);
                viewer.setMeasure(m, measureCount);
            }
        });
        /* nbeer */
    },
    
    reloadDisplay: function() {
        var me = this;
        
        var measureCount = me.intervalSpinner.getValue();
        me.measureSpinner.reloadMeasure(measureCount);
    },
    
    setParts: function(parts) {
        var me = this;
        
        me.parts = parts;
        if(me.parts.getTotalCount() > 0)
            me.voiceFilter.enable();
            
        me.setMdiv(me.mdivSelector);
    },
    
    showVoiceFilterDialog: function() {
    
        var me = this;
    
        me.grid = Ext.create('Ext.grid.Panel', {
                border: false,
                flex: 1,
                selModel: Ext.create('Ext.selection.CheckboxModel'),
                columns: [{ text: 'Part', dataIndex: 'label', flex: 1 }],
                store: me.parts
        });
       
        me.partsDialog = Ext.create('Ext.window.Window', {
            title: 'Parts selection',
            height: 400,
            width: 300,
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            modal: true,
            cls: 'ediromWindow voiceSelection',
            items: [
            me.grid,
            {
                xtype: 'panel',
                border: false,
                flex: 0,
                height: 35,
                padding: '5 5 5 5',
                align: 'right',
                items: [
                    {
                        xtype: 'button',
                        text: 'Cancel',
                        handler: function() {
                            me.partsDialog.close();
                        }
                    },
                    {
                        xtype: 'button',
                        text: 'Ok',
                        margin: '0 0 0 10',
                        listeners:{
                             scope: me,
                             click: me.onPartsSelectionChange
                        }
                    }
                ]
            }
            ]
        });
        
        me.partsDialog.show();
        
        me.grid.getSelectionModel().deselectAll(true);
        
        me.parts.each(function(record) {
            
            if(record.get('selected'))
                me.grid.getSelectionModel().select(record, true, true);
        });
    },
    
    onPartsSelectionChange: function() {
    
        var me = this;
        
        var selected = me.grid.getSelectionModel().getSelection();
        me.parts.each(function(record) {
            record.set('selected', Ext.Array.contains(selected, record));            
        });
        
        me.partsDialog.close();
        me.reloadDisplay();
    },
    
    getContentConfig: function() {
        var me = this;
        return {
            id: this.id
        };
    },
    
    setContentConfig: function(config) {
        var me = this;
        try {
            me.reloadDisplay();
        }catch(e) {}
    },
    
    annotationFilterChanged: function(visibleCategories, visiblePriorities) {
        var me = this;

        me.viewers.each(function(v) {
            v.annotationFilterChanged(visibleCategories, visiblePriorities);
        });
    },

    hideOverlay: function(overlayId) {
        var me = this;
        var state = false;
        
        me.viewers.each(function(v){
            Ext.Array.each(v.imageViewers, function(viewer) {
                if(viewer.isVisible()) {
                     viewer.removeSVGOverlay(overlayId);
                }
            });
        });
    },

    showOverlay: function(overlayId, overlay) {
        var me = this;
        var state = true;
        
        me.viewers.each(function(v){
            Ext.Array.each(v.imageViewers, function(viewer) {
                if(viewer.isVisible()) {
                    viewer.addSVGOverlay(overlayId, overlay);
                }
            });
        });
    }
});

Ext.define('de.edirom.online.view.window.source.HorizontalMeasureViewer', {
    extend: 'Ext.panel.Panel',
    
    mixins: {
        observable: 'Ext.util.Observable'
    },
    
    alias : 'widget.horizontalMeasureViewer',
     
    layout: {
        type: 'hbox',
        align: 'stretch'
    },
    /*layout: 'fit',*/
    
    flex: 1,
    
    border: false,
    
    partLabel: '',
    
    style: {
        borderColor: 'black',
        borderStyle: 'solid',
        borderTop: 2,
        borderBottom: 2,
        borderLeft: 0,
        borderRight: 0
    },
    
    initComponent: function () {

        var me = this;
        
        me.addEvents('showMeasure',
            'measureVisibilityChange',
            'annotationsVisibilityChange',
            'overlayVisibilityChange');
        
        // SourceView
        me.owner.owner.on('measureVisibilityChange', me.onMeasureVisibilityChange, me);
        me.owner.owner.on('annotationsVisibilityChange', me.onAnnotationsVisibilityChange, me);
        
        var viewer = Ext.create('de.edirom.online.view.window.image.ImageViewer', {flex: 1, partLabel: me.partLabel});
        viewer.on('imageChanged', me.onViewerImageChange, me);
        
        me.imageViewers = [viewer];

        me.items = [
            me.imageViewers[0]
        ];

        me.callParent();
    },
    
    onMeasureVisibilityChange: function(view, state) {
        var me = this;
        
        Ext.Array.each(me.imageViewers, function(viewer) {
            if(viewer.isVisible()) {
                me.fireEvent('measureVisibilityChange', viewer, state, viewer.imgId, me.owner.owner.uri);
            }
        });
    },
    
    onAnnotationsVisibilityChange: function(view, state) {
        var me = this;
        
        Ext.Array.each(me.imageViewers, function(viewer) {
            if(viewer.isVisible()) {
                me.fireEvent('annotationsVisibilityChange', viewer, state, viewer.imgId, me.owner.owner.uri, me.owner.owner);
            }
        });
    },
    
    onViewerImageChange: function(viewer, path, pageId) {
        var me = this;
        me.fireEvent('measureVisibilityChange', viewer, me.owner.owner.measuresVisible, viewer.imgId, me.owner.owner.uri);
        me.fireEvent('annotationsVisibilityChange', viewer, me.owner.owner.annotationsVisible, viewer.imgId, me.owner.owner.uri, me.owner.owner);
        //OPERA bwb
/*        me.fireEvent('overlayVisibilityChange', viewer, me.owner.owner.annotationsVisible, viewer.imgId, me.owner.owner.uri, me.owner.owner);*/
        me.owner.owner.overlayMenu.menu.items.each(function(item){
            if(item.checked){
                console.log('measureBased fire for: ' + item.overlayId + ' checked: ' + item.checked);
                console.log(me.owner.owner);
                /*me.owner.owner.fireEvent('overlayVisibilityChange', me.owner, item.overlayId, true);*/
                //viewer, pageId, uri, overlayId, visible
                me.fireEvent('overlayVisibilityChange', viewer, viewer.imgId, me.owner.owner.uri, item.overlayId, item.checked);//me.owner.owner.uri, me.owner.owner, 
            }
        });
    },
    
    setMeasure: function(measure, measureCount) {
        var me = this;
        
        if(me.measure == measure && me.owner.intervalSpinner.getValue() == measureCount) return;
        
        me.measure = measure;

        if(typeof measureCount != 'undefined' && typeof measureCount != 'object' ) me.owner.intervalSpinner.setValue(measureCount);
        
        me.fireEvent('showMeasure', me, me.owner.getUri(), me.measure['id'], me.owner.intervalSpinner.getValue());
    },
    
    showMeasure: function(data) {
        var me = this;
        
        Ext.Array.each(me.imageViewers, function(viewer) {
            viewer.hide();
        });
        
        var grouped = {};
        var groupKeys = [];
        var overallWidth = 0;
        var viewerCount = 0;
        var actPage = '';
        var actSystem = 0;
        var lastULX = 0;
        
        Ext.Array.each(data, function(d) {
            
            var pageId = d['pageId'];
            if(actPage != pageId) {
                viewerCount++;
                actPage = pageId;
                actSystem = 0;
                lastULX = 0;
            }
            
            var ulx = d['ulx'];
            if(lastULX > Number(ulx)) {
                viewerCount++;
                actSystem++;
            }
            
            lastULX = Number(ulx);
            
            var groupKey = pageId + '_' + actSystem;
            Ext.Array.include(groupKeys, groupKey);
            
            if(typeof grouped[groupKey] == 'undefined')
                grouped[groupKey] = {pageId: pageId, width: 0, measures: []};
            
            grouped[groupKey].measures.push(d);

            var width = Number(d['lrx']) - Number(d['ulx']);
            grouped[groupKey].width += width;
            overallWidth += width;
            
            if(typeof me.imageViewers[viewerCount - 1] == 'undefined') {
            
                var viewer = Ext.create('de.edirom.online.view.window.image.ImageViewer', {flex: 1});
                viewer.on('imageChanged', me.onViewerImageChange, me);
            
                me.imageViewers[viewerCount - 1] = viewer;
                me.add(me.imageViewers[viewerCount - 1]);
            }
            
            me.imageViewers[viewerCount - 1].show();
        });
        
        for(var i = 0; i < viewerCount; i++) {
            
            var viewer = me.imageViewers[i];
            var group = grouped[groupKeys[i]];
            viewer.flex = group.width / overallWidth;
        }
        
        me.forceComponentLayout();
        
        for(var i = 0; i < viewerCount; i++) {
            
            var viewer = me.imageViewers[i];
            var group = grouped[groupKeys[i]];
            
            if(group.measures[0]['path'] != viewer.imgPath) {
                viewer.clear();
                viewer.showImage(group.measures[0]['path'], group.measures[0]['width'], group.measures[0]['height'], group.measures[0]['pageId']);
            }
            
            var ulx = Number.MAX_VALUE;
            var uly = Number.MAX_VALUE;
            var lrx = Number.MIN_VALUE;
            var lry = Number.MIN_VALUE;
            
            Ext.Array.each(group.measures, function(d) {
                if(Number(d['ulx']) < ulx) ulx = Number(d['ulx']);
                if(Number(d['uly']) < uly) uly = Number(d['uly']);
                if(Number(d['lrx']) > lrx) lrx = Number(d['lrx']);
                if(Number(d['lry']) > lry) lry = Number(d['lry']);
            });
            
            var width = lrx - ulx;
            var height = lry - uly;
    
            viewer.showRect(ulx, uly, width, height, true);
        }
    },
    
    annotationFilterChanged: function(visibleCategories, visiblePriorities) {
        var me = this;
        
        Ext.Array.each(me.imageViewers, function(viewer) {
            var annotations = viewer.getShapes('annotations');
            var fn = Ext.bind(function(annotation) {
                var annotDiv = viewer.getShapeElem(annotation.id);
                var className = annotDiv.dom.className.replace('annotation', '').trim();
                var classes = className.split(' ');
    
                var hasCategory = false;
                var hasPriority = false;
    
                for(var i = 0; i < classes.length; i++) {
                    hasCategory |= Ext.Array.contains(visibleCategories, classes[i]);
                    hasPriority |= Ext.Array.contains(visiblePriorities, classes[i]);
                }
    
                annotDiv.setVisible(hasCategory & hasPriority);
            }, me);
    
            if(annotations.each)
                annotations.each(fn);
            else
                Ext.Array.each(annotations, fn);
        });
    },
    
    addSVGOverlay: function(overlayId, overlay) {
        var me = this;
        var sibling = me.el.getById(me.id + '_facsContEvents');

        var dh = Ext.DomHelper;
        var id = Ext.id({});
        var svg = dh.insertBefore(sibling, {
            id: me.id + '_' + id,
            tag: 'div',
            cls: 'overlay',
            html: overlay
        }, true);

        svg.child('svg', true).setAttribute("width", me.imgWidth * me.zoom);
        svg.child('svg', true).setAttribute("height", me.imgHeight * me.zoom);
        svg.child('svg', true).setAttribute("style", "top:" +  me.offY + "px; left:" +  me.offX + "px; position: absolute;");

        me.svgOverlays.add(overlayId, svg);
    },

    removeSVGOverlay: function(overlayId) {
        var me = this;
        me.svgOverlays.get(overlayId).destroy();
        me.svgOverlays.removeAtKey(overlayId);
    }
    
    
});

//TODO: mit de.edirom.online.view.window.source.PageSpinner zusammen legen
Ext.define('de.edirom.online.view.window.source.MeasureSpinner', {
    extend: 'Ext.container.Container',

    alias : 'widget.measureSpinner',

    layout: 'hbox',
    
    mdivSelected: -1,

    initComponent: function () {

        var me = this;
        
        me.items = [
        ];
        me.callParent();
        
        if(me.owner.mdivSelected)
            me.mdivSelected = me.owner.mdivSelected; 
    },

    next: function() {

        var me = this;
        me.combo.getStore().clearFilter(false);

        var oldIndex = me.combo.getStore().findExact('id', me.combo.getValue());
        if(oldIndex + 1 < me.combo.getStore().getCount())
            me.setMeasure(me.combo.getStore().getAt(oldIndex + 1).get('id'));
    },

    prev: function() {

        var me = this;
        me.combo.getStore().clearFilter(false);

        var oldIndex = me.combo.getStore().findExact('id', me.combo.getValue());
        if(oldIndex > 0)
            me.setMeasure(me.combo.getStore().getAt(oldIndex - 1).get('id'));
    },

    reloadMeasure: function(measureCount) {
        this.owner.setMeasure(this.combo, this.combo.store, measureCount);
    },

    setMeasure: function(id, measureCount) {
        this.combo.setValue(id);
        
        this.owner.setMeasure(this.combo, this.combo.store, measureCount);
    },
    
    setStore: function(store) {
        var me = this;
       
        me.removeAll();
        
        me.combo = Ext.create('Ext.form.ComboBox', {
            width: 100,
            hideTrigger: true,
            queryMode: 'local',
            store: store,
            displayField: 'name',
            valueField: 'id',
            cls: 'pageInputBox',
            autoSelect: true
        });
        
        me.add([
            {
                xtype: 'button',
                cls : 'prev toolButton',
                tooltip: { text: getLangString('view.window.source.SourceView_MeasureBasedView_previousMeasure'), align: 'bl-tl' },
                listeners:{
                     scope: me,
                     click: me.prev
                }
            },
            me.combo,
            {
                xtype: 'button',
                cls : 'next toolButton',
                tooltip: { text: getLangString('view.window.source.SourceView_MeasureBasedView_nextMeasure'), align: 'bl-tl' },
                listeners:{
                     scope: me,
                     click: me.next
                }
            }
        ]);

        this.combo.on('select', this.owner.setMeasure, this.owner);
    },
    
    onIntervalChange: function(field, newValue, oldValue, opts) {
        this.owner.setMeasure(this.combo, this.combo.store);
    }
});

Ext.define('de.edirom.online.view.window.source.IntervalSpinner', {
    extend: 'Ext.form.Spinner',
    cls: 'intervalSpinner', //bwb-2017
    step: 1,
    size: 4,
    
    onSpinUp: function() {
        var me = this;
        if (!me.readOnly) {
            var val = me.step;
            if(me.getValue() !== '') {
                val = parseInt(me.getValue());
            }
            
            if(val + me.step <= me.maxValue)
                me.setValue(val + me.step);
        }
    },

    onSpinDown: function() {
        var val, me = this;
        if (!me.readOnly) {
            if(me.getValue() !== '') {
                val = parseInt(me.getValue());
            }
            
            if(val - me.step >= me.minValue)
                me.setValue(val - me.step);
        }
    }
});
