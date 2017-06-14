/*!
 * Ext JS Library 4.0
 * Copyright(c) 2006-2011 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */

/**
 * @class Ext.ux.desktop.Desktop
 * @extends Ext.panel.Panel
 * <p>这个类文件是管理 壁纸, 桌面图标 和任务栏.</p>
 */
Ext.define('Ext.ux.desktop.Desktop', {
    extend: 'Ext.panel.Panel',

    alias: 'widget.desktop',

    uses: [
        'Ext.util.MixedCollection',
        'Ext.menu.Menu',
        'Ext.view.View', // dataview
        'Ext.window.Window',
        'Ext.ux.desktop.ShortcutDesktop',
        'Ext.ux.desktop.TaskBar',
        'Ext.ux.desktop.Wallpaper',
        'Ext.ux.desktop.View'
    ],

    activeWindowCls: 'ux-desktop-active-win',
    inactiveWindowCls: 'ux-desktop-inactive-win',
    lastActiveWindow: null,

    border: false,
    html: '&#160;',
    id:'wmsdesktop',
    layout: 'fit',
    xTickSize: 1,
    yTickSize: 1,
    app: null,

    /**
     * @cfg {Array|Store} shortcuts
     * The items to add to the DataView. This can be a {@link Ext.data.Store Store} or a
     * simple array. Items should minimally provide the fields in the
     * {@link Ext.ux.desktop.ShorcutModel ShortcutModel}.
     */
    shortcuts: null,

    /**
     * @cfg {String} shortcutItemSelector
     * This property is passed to the DataView for the desktop to select shortcut items.
     * If the {@link #shortcutTpl} is modified, this will probably need to be modified as
     * well.
     */
    shortcutItemSelector: 'div.ux-desktop-shortcut',

    /**
     * @cfg {String} shortcutTpl
     * This XTemplate is used to render items in the DataView. If this is changed, the
     * {@link shortcutItemSelect} will probably also need to changed.
     */
    shortcutTpl: [
        '<tpl for=".">',
            '<div class="ux-desktop-shortcut" id="{name}-shortcut">',
                '<div class="ux-desktop-shortcut-icon {iconCls}">',
                    '<img src="',Ext.BLANK_IMAGE_URL,'" title="{name}">',
                '</div>',
                '<span class="ux-desktop-shortcut-text">{name}</span>',
            '</div>',
        '</tpl>',
        '<div class="x-clear"></div>'
    ],

    /**
     * @cfg {Object} taskbarConfig
     * The config object for the TaskBar.
     */
    taskbarConfig: null,

    windowMenu: null,

    initComponent: function () {
        var me = this;
        
        Ext.MessageBox.updateProgress(0.40,'40%','<br/>正在初始化系统菜单...');
        
        me.initContextMenu();
        
        Ext.MessageBox.updateProgress(0.65,'65%','<br/>正在初始化任务栏...');
        
        me.bbar = me.taskbar = new Ext.ux.desktop.TaskBar(me.taskbarConfig);
        
        me.taskbar.windowMenu = me.windowMenu;//任务栏右键响应菜单
        
        me.windows = new Ext.util.MixedCollection();//所有已打开的窗口

        me.items = [{ 
        	xtype: 'wallpaper', id: me.id+'_wallpaper'
        }/*,me.createDataView()*/];

        me.callParent();

        /*me.shortcutsView = me.items.getAt(1);
        
        if(Ext.is.Desktop){
        	//添加点击桌面图标事件，这里监听双击事件
        	me.shortcutsView.on('itemdblclick', me.onShortcutItemClick, me);
        }else{
        	//主要针对手机用户
        	me.shortcutsView.on('itemclick', me.onShortcutItemClick, me);
        }*/
       /* console.log(me.shortcutsView);*/
        
        var wallpaper = me.wallpaper;
        me.wallpaper = me.items.getAt(0);
        if (wallpaper) {
            me.setWallpaper(wallpaper, me.wallpaperStretch);
        }
        
        Ext.EventManager.onWindowResize(me.refreshView, this, {delay:100});
    },

    afterRender: function () {
        var me = this;
        me.callParent();
        me.el.on('contextmenu', me.onDesktopMenu, me);
        if(Ext.get('copy-right')){
        	Ext.get('copy-right').on('contextmenu', me.onDesktopMenu, me);
        }
        Ext.Function.defer(me.initShortcut,1);
    },

    getMenu:function(dataView, record, item, index, e){
    	var me = this;
    	return Ext.create('Ext.menu.Menu',{
    		items : [{
    			text : '打开',
    			listeners:{
    				click:function(){
    					me.onShortcutItemClick(dataView, record, item, index, e);
    				}
    			}
    			//iconCls : 'upload',
    			//handler : me.onShortcutItemClick(dataView, record, item, index, e)
    		},{
    			text : '删除'
    			//iconCls : 'delete',
    			//handler : deleteSelected
    		}]
    	});
    },
    
    initView : function(){
    	var me = this;
    	Ext.MessageBox.updateProgress(0.8,'80%','<br/>正在初始化桌面图标...');
    	me.view = Ext.create('Ext.ux.desktop.View',{
            desktop : me,
            store : me.shortcuts,
            app : me.app
        });
        me.add(me.view);
        me.view.init();
    },
    
    refreshView : function(){
    	var me = this;
		me.view.refresh();
    },
    refreshPage:function(){
    	var me = this;
    	self.location.reload(true);
    },
    //初始化各种菜单
    initContextMenu:function(){
    	var me = this;
    	me.windowMenu = new Ext.menu.Menu(me.createWindowMenu());
    	me.contextMenu = new Ext.menu.Menu(me.createDesktopMenu());
    },
    
    //------------------------------------------------------
    // Overrideable configuration creation methods

    createDataView: function () {
        var me = this;
        return {
            xtype: 'dataview',
            style : {
            	position: 'absolute',
				fontFamily : '微软雅黑'
			},
			multiSelect : false,
			overItemCls: 'x-view-over',
            trackOver: true,
            itemSelector: me.shortcutItemSelector,
            store: me.shortcuts,
            x: 0, y: 0,
            tpl: new Ext.XTemplate(me.shortcutTpl),
            listeners:{
              resize:me.initShortcut,
              itemcontextmenu:function(dataView, record, item, index, e){
            	  var menu = me.getMenu(dataView, record, item, index, e);
            	  e.stopEvent();
            	  menu.showAt(e.getXY());
            	  menu.doConstrain();
              },
              itemmouseleave:{
            	 fn:me.onShortcutItemMouseLeave//鼠标离开桌面图标时响应的事件
              },
              itemmouseenter:{
            	  fn:me.onShortcutItemMouseEnter//鼠标到达桌面图标时响应的事件
              }
          }
        };
    },

    createDesktopMenu: function () {
        var me = this, ret = {
            items: me.contextMenuItems || []
        };

        if (ret.items.length) {
            ret.items.push('-');
        }

        ret.items.push({
        	text: '刷新系统',
        	scope: me,
        	menu:[{
        		text: '刷新桌面',
        		scope: me,
        		handler:me.refreshView
        	},{
        		text: '刷新页面',
        		scope: me,
        		handler:me.refreshPage
        	}]
        });
        
        ret.items.push(
                { text: '关闭所有', handler: me.closeAllWindows, scope: me, minWindows: 1 },
                { text: '显示桌面', handler: me.miniAllWindows, scope: me, minWindows: 1 },
                { text: '平铺排放', handler: me.tileWindows, scope: me, minWindows: 1 },
                { text: '折叠排放', handler: me.cascadeWindows, scope: me, minWindows: 1 });

        return ret;
    },

    createWindowMenu: function () {
        var me = this;
        return {
            defaultAlign: 'br-tr',
            items: [
                { text: '显 示', handler: me.onWindowMenuRestore, scope: me },
                { text: '最小化', handler: me.onWindowMenuMinimize, scope: me },
                { text: '最大化', handler: me.onWindowMenuMaximize, scope: me },
                '-',
                { text: '关闭', handler: me.onWindowMenuClose, scope: me }
            ],
            listeners: {
                beforeshow: me.onWindowMenuBeforeShow,
                hide: me.onWindowMenuHide,
                scope: me
            }
        };
    },

    //------------------------------------------------------
    // Event handler methods

    onDesktopMenu: function (e) {
        var me = this, menu = me.contextMenu;
        e.stopEvent();
        if (!menu.rendered) {
            menu.on('beforeshow', me.onDesktopMenuBeforeShow, me);
        }
        menu.showAt(e.getXY());
        menu.doConstrain();
    },

    //桌面右键菜单显示前
    onDesktopMenuBeforeShow: function (menu) {
        var me = this, count = me.windows.getCount();

        menu.items.each(function (item) {
            var min = item.minWindows || 0;
            item.setDisabled(count < min);
        });
    },

    //处理双击桌面图标函数
    onShortcutItemClick: function (dataView, record,item,index,e,opts) {
        var me = this, module = me.app.getModule(record.data.module),
            win;
        win = Ext.getCmp(module.id);
        if(win==null){
        	win = module && module.createWindow();
        }
        if (win) {
            me.restoreWindow(win);
        }
    },
    
    //处理鼠标移动事件
    onShortcutItemMouseEnter:function(dataView, record,item,index,e,opts){
    	var wmstips = record.data.wmstips;
    	var tip = Ext.create('Ext.tip.ToolTip', {
    		closeAction:'destroy',
    		id:'wmstooltip',
    	    html: wmstips
    	});
    	tip.showAt([wmsmodulx[index],wmsmoduly[index]]);
    },
    
    //处理鼠标移动事件
    onShortcutItemMouseLeave:function(){
    	var wmstooltip = Ext.getCmp('wmstooltip');
    	if(wmstooltip!=null){
    		wmstooltip.close();
    	}
    },
    
    //处理窗口关闭函数
    onWindowClose: function(win) {
        var me = this;
        me.windows.remove(win);
        me.taskbar.removeTaskButton(win.taskButton);
        me.updateActiveWindow();
    },

    //------------------------------------------------------
    // Window context menu handlers

    onWindowMenuBeforeShow: function (menu) {
        var items = menu.items.items, win = menu.theWin;
        items[0].setDisabled(win.maximized !== true && win.hidden !== true); // Restore
        items[1].setDisabled(win.minimized === true); // Minimize
        items[2].setDisabled(win.maximized === true || win.hidden === true); // Maximize
    },

    //处理单个窗口的关闭函数，会自动查看那个窗口的关闭属性
    onWindowMenuClose: function () {
        var me = this, win = me.windowMenu.theWin;
        if(win.closable){
        	win.close();
        }
    },

  //处理单个窗口的隐藏函数，会自动查看那个窗口的隐藏属性
    onWindowMenuHide: function (menu) {
        menu.theWin = null;
    },
  //处理单个窗口的最大化函数，会自动查看那个窗口的最大化属性
    onWindowMenuMaximize: function () {
        var me = this, win = me.windowMenu.theWin;
        if(win.maximizable){
        	win.maximize();
            win.toFront();
        }
    },
    //处理单个窗口的最小化函数，会自动查看那个窗口的最小化属性
    onWindowMenuMinimize: function () {
        var me = this, win = me.windowMenu.theWin;

        win.minimize();
    },

  //处理单个窗口的显示函数
    onWindowMenuRestore: function () {
        var me = this, win = me.windowMenu.theWin;

        me.restoreWindow(win);
    },

    //------------------------------------------------------
    // Dynamic (re)configuration methods

    //获取当前的壁纸
    getWallpaper: function () {
        return this.wallpaper.wallpaper;
    },

    setTickSize: function(xTickSize, yTickSize) {
        var me = this,
            xt = me.xTickSize = xTickSize,
            yt = me.yTickSize = (arguments.length > 1) ? yTickSize : xt;

        me.windows.each(function(win) {
            var dd = win.dd, resizer = win.resizer;
            dd.xTickSize = xt;
            dd.yTickSize = yt;
            resizer.widthIncrement = xt;
            resizer.heightIncrement = yt;
        });
    },

    //设置壁纸
    setWallpaper: function (wallpaper, stretch) {
        this.wallpaper.setWallpaper(wallpaper, stretch);
        return this;
    },

    //------------------------------------------------------
    // Window management methods

    //折叠排放
    cascadeWindows: function() {
        var x = 0, y = 0,
            zmgr = this.getDesktopZIndexManager();

        zmgr.eachBottomUp(function(win) {
            if (win.isWindow && win.isVisible() && !win.maximized) {
                win.setPosition(x, y);
                x += 20;
                y += 20;
            }
        });
    },

    //创建一个窗口
    createWindow: function(config, cls) {
        var me = this, win, cfg = Ext.applyIf(config || {}, {
                stateful: false,
                isWindow: true,
                constrainHeader: true,
                minimizable: true,
                maximizable: true
            });
        Ext.newstip.msg('提示', '应用<b>'+config.title+'</b>创建!',3000);
        cls = cls || Ext.window.Window;
        win = me.add(new cls(cfg));

        me.windows.add(win);

        win.taskButton = me.taskbar.addTaskButton(win);
        win.animateTarget = win.taskButton.el;

      //监听窗口事件
        win.on({
            activate: me.updateActiveWindow,
            beforeshow: me.updateActiveWindow,
            deactivate: me.updateActiveWindow,
            minimize: me.minimizeWindow,
            destroy: me.onWindowClose,
            scope: me
        });

        //监听窗口事件
        win.on({
            boxready: function () {
                win.dd.xTickSize = me.xTickSize;
                win.dd.yTickSize = me.yTickSize;

                if (win.resizer) {
                    win.resizer.widthIncrement = me.xTickSize;
                    win.resizer.heightIncrement = me.yTickSize;
                }
            },
            single: true
        });

        // replace normal window close w/fadeOut animation:
        //窗口销毁时，执行的函数
        win.doClose = function ()  {
            win.doClose = Ext.emptyFn; // dblclick can call again...
            win.el.disableShadow();
            win.el.fadeOut({
                listeners: {
                    afteranimate: function () {
                        win.destroy();
                    }
                }
            });
        };
        return win;
    },

    //获取当前激活的窗口
    getActiveWindow: function () {
        var win = null,
            zmgr = this.getDesktopZIndexManager();

        if (zmgr) {
            // We cannot rely on activate/deactive because that fires against non-Window
            // components in the stack.

            zmgr.eachTopDown(function (comp) {
                if (comp.isWindow && !comp.hidden) {
                    win = comp;
                    return false;
                }
                return true;
            });
        }

        return win;
    },

    getDesktopZIndexManager: function () {
        var windows = this.windows;
        // TODO - there has to be a better way to get this...
        return (windows.getCount() && windows.getAt(0).zIndexManager) || null;
    },

    //获取窗口
    getWindow: function(id) {
        return this.windows.get(id);
    },

    //最小化窗口
    minimizeWindow: function(win) {
        win.minimized = true;
        win.hide();
    },

    //窗口还原
    restoreWindow: function (win) {
        if (win.isVisible()) {
            win.restore();
            win.toFront();
        } else {
            win.show();
        }
        return win;
    },

    //关闭所有窗口
    closeAllWindows:function(){
    	var me = this;
    	me.windows.each(function(win){
    		if(win.closable){
    			win.close();
    		}
    	});
    },
    
  //最小化所有窗口，显示桌面
    miniAllWindows:function(){
    	var me = this;
    	me.windows.each(function(win){
    		win.minimize();
    	});
    },
    
    //平埔排放
    tileWindows: function() {
        var me = this, availWidth = me.body.getWidth(true);
        var x = me.xTickSize, y = me.yTickSize, nextY = y;

        me.windows.each(function(win) {
            if (win.isVisible() && !win.maximized) {
                var w = win.el.getWidth();

                // Wrap to next row if we are not at the line start and this Window will
                // go off the end
                if (x > me.xTickSize && x + w > availWidth) {
                    x = me.xTickSize;
                    y = nextY;
                }

                win.setPosition(x, y);
                x += w + me.xTickSize;
                nextY = Math.max(nextY, y + win.el.getHeight() + me.yTickSize);
            }
        });
    },

    //更新激活的窗口
    updateActiveWindow: function () {
        var me = this, activeWindow = me.getActiveWindow(), last = me.lastActiveWindow;
        if (activeWindow === last) {
            return;
        }
        if (last) {
            if (last.el.dom) {
                last.addCls(me.inactiveWindowCls);
                last.removeCls(me.activeWindowCls);
            }
            last.active = false;
        }
        me.lastActiveWindow = activeWindow;
        if (activeWindow) {
            activeWindow.addCls(me.activeWindowCls);
            activeWindow.removeCls(me.inactiveWindowCls);
            activeWindow.minimized = false;
            activeWindow.active = true;
        }
        me.taskbar.setActiveButton(activeWindow && activeWindow.taskButton);
    },
    initShortcut : function() {
        var btnHeight = 64;
        var btnWidth = 64;
        var btnPadding = 30;
        var col = {index : 1,x : btnPadding};
        var row = {index : 1,y : btnPadding};
        var bottom;
        var numberOfItems = 0;
        var taskBarHeight = Ext.query(".ux-taskbar")[0].clientHeight + 40;
        var bodyHeight = Ext.getBody().getHeight() - taskBarHeight;
        var items = Ext.query(".ux-desktop-shortcut");
        wmsmodulx = [];
        wmsmoduly = [];
        for (var i = 0, len = items.length; i < len; i++) {
            numberOfItems += 1;
            bottom = row.y + btnHeight;
            if (((bodyHeight < bottom) ? true : false) && bottom > (btnHeight + btnPadding)) {
                numberOfItems = 0;
                col = {index : col.index++,x : col.x + btnWidth + btnPadding};
                row = {index : 1,y : btnPadding};
            }
            wmsmodulx[i]=col.x;
            wmsmoduly[i]=row.y;
            Ext.fly(items[i]).setXY([col.x, row.y]);
            row.index++;
            row.y = row.y + btnHeight + btnPadding;
        }
    }
});
