const storage = require('../../utils/storage')

const oldObjects = [
  { name: '磁带与随身听', desc: '那时候音乐要AB面翻着听，倒带还要用铅笔转。', img: 'https://images.unsplash.com/photo-1673829754882-0ced60536fcd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400' },
  { name: '铁皮青蛙', desc: '拧紧发条就会在地上蹦蹦跳跳的绿色小青蛙。', img: 'https://images.unsplash.com/photo-1647850143347-641e36ba14f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400' },
  { name: '小霸王游戏机', desc: '周末偷偷连上电视，和小伙伴一起打魂斗罗。', img: 'https://images.unsplash.com/photo-1587653666447-8a232c92e881?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400' },
  { name: '大大卷泡泡糖', desc: '像卷尺一样，每次只舍得剪下一点点嚼。', img: 'https://images.unsplash.com/photo-1775854214297-933be605864e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400' },
  { name: '缝纫机', desc: '奶奶脚踏缝纫机，发出"哒哒哒"的声音。', img: 'https://images.unsplash.com/photo-1762854207154-f6b3463514cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400' },
  { name: '玻璃弹珠', desc: '下课后趴在地上弹玻璃球，口袋里总是沉甸甸的。', img: 'https://images.unsplash.com/photo-1632519014462-ac1f6ea2cffb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400' }
]

const oldScenes = [
  { name: '学校门口小卖部', desc: '放学后挤满人，买五毛钱一包的辣条和汽水。', img: 'https://images.unsplash.com/photo-1766267190308-964d14eb2eb5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400' },
  { name: '停电点蜡烛', desc: '夏天的晚上突然停电，一家人点着蜡烛摇蒲扇。', img: 'https://images.unsplash.com/photo-1715837602242-8e3fb8c06124?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400' },
  { name: '露天电影', desc: '村口或广场上拉起白布，大家搬着小板凳早早占座。', img: 'https://images.unsplash.com/photo-1756729924123-d7e8d85afaec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400' },
  { name: '爆米花摊', desc: '"砰"的一声巨响，空气里全是香甜的米花味。', img: 'https://images.unsplash.com/photo-1710781241285-471120a3e39c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400' },
  { name: '新华书店', desc: '一坐就是半天，偷偷看武侠小说和漫画。', img: 'https://images.unsplash.com/photo-1623771702034-4ff478ad8e10?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400' },
  { name: '胡同/大院乘凉', desc: '邻居们聚在一起聊天，切开刚从井水里捞出的西瓜。', img: 'https://images.unsplash.com/photo-1678166011538-4a8429328a40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400' }
]

Page({
  data: {
    statusBarHeight: 0,
    showOnboarding: false,
    showSheet: false,
    sheetTitle: '',
    sheetItems: [],
    previewImage: ''
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: systemInfo.statusBarHeight })

    if (!storage.isOnboardingShown()) {
      this.setData({ showOnboarding: true })
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  dismissOnboarding() {
    storage.setOnboardingShown()
    this.setData({ showOnboarding: false })
  },

  navigateTo(e) {
    const url = e.currentTarget.dataset.url
    wx.navigateTo({ url })
  },

  showOldObjects() {
    this.setData({
      showSheet: true,
      sheetTitle: '小时候的老物件',
      sheetType: 'objects',
      sheetItems: oldObjects
    })
  },

  showOldScenes() {
    this.setData({
      showSheet: true,
      sheetTitle: '小时候的老场景',
      sheetType: 'scenes',
      sheetItems: oldScenes
    })
  },

  hideSheet() {
    this.setData({ showSheet: false })
  },

  previewImg(e) {
    const src = e.currentTarget.dataset.src
    this.setData({ previewImage: src })
  },

  closePreview() {
    this.setData({ previewImage: '' })
  },

  preventBubble() {}
})
