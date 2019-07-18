const routers = [
    {
        path: '/home',
        name: 'home',
        // @ts-ignore
        component: () => import('@/components/menu-bar/MenuBar.vue'),
        children: [
            {
                path: '/monitorPanel',
                name: 'monitorPanel',
                // @ts-ignore
                component: () => import('@/views/monitor/monitor-panel/MonitorPanel.vue'),
                children: [
                    {
                        path: '/monitorPanel',
                        name: 'monitorPanel',
                        // @ts-ignore
                        component: () => import('@/views/monitor/monitor-dashboard/MonitorDashBoard.vue')
                    },
                    {
                        path: '/dashBoard',
                        name: 'dashBoard',
                        // @ts-ignore
                        component: () => import('@/views/monitor/monitor-dashboard/MonitorDashBoard.vue')
                    }, {
                        path: '/market',
                        name: 'market',
                        // @ts-ignore
                        component: () => import('@/views/monitor/monitor-market/MonitorMarket.vue')
                    }, {
                        path: '/transfer',
                        name: 'transfer',
                        // @ts-ignore
                        component: () => import('@/views/monitor/monitor-transfer/MonitorTransfer.vue')
                    }, {
                        path: '/receipt',
                        name: 'receipt',
                        // @ts-ignore
                        component: () => import('@/views/monitor/monitor-receipt/MonitorReceipt.vue')
                    }, {
                        path: '/remote',
                        name: 'remote',
                        // @ts-ignore
                        component: () => import('@/views/monitor/monitor-dashboard/MonitorDashBoard.vue')
                    },

                ]
            },
            {
                path: '/walletPanel',
                name: 'walletPanel',
                // @ts-ignore
                component: () => import('@/views/wallet-management/wallet-panel/WalletPanel.vue'),
                children: [
                    {
                        path: '/walletDetails',
                        name: 'walletDetails',
                        // @ts-ignore
                        component: () => import('@/views/wallet-management/wallet-details/WalletDetails.vue')
                    }, {
                        path: '/walletCreate',
                        name: 'walletCreate',
                        // @ts-ignore
                        component: () => import('@/views/wallet-management/wallet-create/WalletCreate.vue')
                    }, {
                        path: '/WalletCreated',
                        name: 'WalletCreated',
                        // @ts-ignore
                        component: () => import('@/views/wallet-management/wallet-created/WalletCreated.vue')
                    }, {
                        path: '/walletImport',
                        name: 'walletImport',
                        // @ts-ignore
                        component: () => import('@/views/wallet-management/wallet-import/WalletImport.vue')
                    },
                ]
            },
            {
                path: '/servicePanel',
                name: 'servicePanel',
                // @ts-ignore
                component: () => import('@/views/service/service-panel/ServicePanel.vue'),
                children: [
                    {
                        path: '/onDev',
                        name: 'onDev',
                        // @ts-ignore
                        component: () => import('@/views/other/onDev/onDev.vue')
                    }, {
                        path: '/namespace',
                        name: 'namespace',
                        // @ts-ignore
                        component: () => import('@/views/service/namespace/Namespace.vue')
                    }, {
                        path: '/mosaic',
                        name: 'mosaic',
                        // @ts-ignore
                        component: () => import('@/views/service/mosaic/Mosaic.vue')
                    },
                ]
            },
            {
                path: '/communityPanel',
                name: 'communityPanel',
                // @ts-ignore
                component: () => import('@/views/community/community-panel/communityPanel.vue'),
                children: [
                    {
                        path: '/communityPanel',
                        name: 'communityPanel',
                        // @ts-ignore
                        component: () => import('@/views/community/information/information.vue')
                    }, {
                        path: '/information',
                        name: 'information',
                        // @ts-ignore
                        component: () => import('@/views/community/information/information.vue')
                    }, {
                        path: '/vote',
                        name: 'vote',
                        // @ts-ignore
                        component: () => import('@/views/community/vote/vote.vue')
                    },
                ]
            },
            {
                path: '/settingPanel',
                name: 'settingPanel',
                // @ts-ignore
                component: () => import('@/views/setting/setting-panel/SettingPanel.vue'),
                children: [
                    {
                        path: '/settingAbout',
                        name: 'settingAbout',
                        // @ts-ignore
                        component: () => import('@/views/setting/setting-about/SettingAbout.vue')
                    },{
                        path: '/settingLock',
                        name: 'settingLock',
                        // @ts-ignore
                        component: () => import('@/views/setting/setting-lock/SettingLock.vue')
                    },{
                        path: '/settingNetwork',
                        name: 'settingNetwork',
                        // @ts-ignore
                        component: () => import('@/views/setting/setting-network/SettingNetwork.vue')
                    },{
                        path: '/settingNormal',
                        name: 'settingNormal',
                        // @ts-ignore
                        component: () => import('@/views/setting/setting-normal/SettingNormal.vue')
                    },{
                        path: '/settingPanel',
                        name: 'settingPanel',
                        // @ts-ignore
                        component: () => import('@/views/setting/setting-normal/SettingNormal.vue')
                    },
                ]
            },
            {
                path: '/monitorRelogin',
                name: 'monitorRelogin',
                // @ts-ignore
                component: () => import('@/views/monitor/monitor-relogin/MonitorRelogin.vue'),
            },
        ]
    },
    {
        path: '/',
        name: 'login',
        component: function () {
            return import('@/components/menu-bar/MenuBar.vue')
        },
        children: [
            {
                path: '/reLogin',
                name: 'reLogin',
                // @ts-ignore
                component: () => import('@/views/monitor/monitor-relogin/MonitorRelogin.vue'),
            },
            {
                path: '/login',
                name: 'login',
                component: function () {
                    return import('@/views/login/set-account/SetAccount.vue');
                },
            },
            {
                path: '/checkAccount',
                name: 'checkAccount',
                component: function () {
                    return import('@/views/login/check-account/CheckAccount.vue');
                },
            },

        ]
    },
    , {
        path: '/',
        name: 'login',
        component: function () {
            return import('@/views/login/Login.vue');
        },
    }
]

export default routers
