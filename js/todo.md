## Requirements Implementation Checklist

### 1. 点击返回大厅按钮后，停止局内行为，而不是返回大厅后AI还在发牌下注。
- [ ] Add flag to stop game when lobby button clicked
- [ ] Cancel any ongoing setTimeout/promises
- [ ] Clear game state properly
- [ ] Ensure AI actions stop immediately

### 2. 将XXXwin的对话框改为结算弹窗，颜色以#2c3e50和其相近颜色为主。
- [ ] Modify the alert() in `distributePot()` to use custom modal
- [ ] Create CSS for modal with #2c3e50 color scheme
- [ ] Update winner messages to use modal
- [ ] Handle game-end modal as well

### 3. 设置内数据，用户余额，用户昵称需要数据持久化，哪怕F5后仍不会数据丢失。
- [ ] Implement localStorage for settings
- [ ] Save nickname, chips, settings on change
- [ ] Load on page load
- [ ] Update currentUserChips globally with saved values
