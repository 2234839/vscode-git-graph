<script setup lang="ts">
/**
 * CommitTable — 提交列表表格
 *
 * 用 Vue v-for 声明式渲染替代原 mainController 的 renderTable innerHTML 拼接。
 * 数据来自 store.commitRows computed（已预格式化）。
 *
 * HTML 结构和 class 名称与原版完全一致，确保 main.css 样式正确应用。
 */
import { computed, ref, onMounted, onUpdated, watch, nextTick } from 'vue';
import { useGitGraphStore } from '@/stores/gitGraph';
import IconSvg from '@/components/IconSvg.vue';
import CommitDetails from '@/components/CommitDetails.vue';

const store = useGitGraphStore();

/** 列可见性 */
const colVisibility = computed(() => store.getColumnVisibility());

/** branchLabels 对齐方式 */
const branchLabelsAlignedToGraph = computed(() => store.config.referenceLabels.branchLabelsAlignedToGraph);
const tagLabelsOnRight = computed(() => store.config.referenceLabels.tagLabelsOnRight);

/** commit 表格容器引用（用于滚动） */
const tableElem = ref<HTMLElement | null>(null);

/** 表格布局 class（由 makeTableResizable 设置） */
const tableLayoutClass = ref('autoLayout');

/** 滚动处理 */
function onScroll() {
  if (tableElem.value) {
    store.scrollTop = tableElem.value.scrollTop;
  }
}

/** 加载更多 commits */
function loadMoreCommits() {
  store.loadMoreCommits();
}

/** 监听 pendingScrollTo，执行滚动 */
watch(() => store.pendingScrollTo, (target) => {
  if (target && tableElem.value) {
    nextTick(() => {
      const id = store.getCommitId(target.hash);
      const elem = tableElem.value?.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
      if (elem) {
        if (target.alwaysCenter) {
          elem.scrollIntoView({ block: 'center' });
        } else {
          elem.scrollIntoView({ block: 'nearest' });
        }
        if (target.flash) {
          elem.classList.add('flash');
          setTimeout(() => elem.classList.remove('flash'), 1000);
        }
      }
      store.pendingScrollTo = null;
    });
  }
});

/** 恢复滚动位置 */
onMounted(() => {
  if (tableElem.value && store.scrollTop) {
    tableElem.value.scrollTop = store.scrollTop;
  }
});

/** 渲染后恢复滚动位置 */
onUpdated(() => {
  if (tableElem.value && store.scrollTop !== tableElem.value.scrollTop) {
    tableElem.value.scrollTop = store.scrollTop;
  }
});
</script>

<template>
  <div
    id="commitTable"
    ref="tableElem"
    :class="tableLayoutClass"
    @scroll="onScroll"
  >
    <table>
      <!-- 表头 -->
      <thead>
        <tr id="tableColHeaders" @contextmenu="(e) => store.onTableHeaderContextMenu(e)">
          <th id="tableHeaderGraphCol" class="tableColHeader" data-col="0">
            {{ store.t('colGraph') }}
            <span class="resizeCol right" data-col="0" @mousedown="(e) => store.startColumnResize(e, 0)"></span>
          </th>
          <th class="tableColHeader" data-col="1">
            <span class="resizeCol left" data-col="0" @mousedown="(e) => store.startColumnResize(e, 0)"></span>
            {{ store.t('colDescription') }}
            <span class="resizeCol right" data-col="1" @mousedown="(e) => store.startColumnResize(e, 1)"></span>
          </th>
          <th v-if="colVisibility.date" class="tableColHeader dateCol" data-col="2">
            <span class="resizeCol left" data-col="1" @mousedown="(e) => store.startColumnResize(e, 1)"></span>
            {{ store.t('colDate') }}
            <span class="resizeCol right" data-col="2" @mousedown="(e) => store.startColumnResize(e, 2)"></span>
          </th>
          <th v-if="colVisibility.author" class="tableColHeader authorCol" data-col="3">
            <span class="resizeCol left" data-col="2" @mousedown="(e) => store.startColumnResize(e, 2)"></span>
            {{ store.t('colAuthor') }}
            <span class="resizeCol right" data-col="3" @mousedown="(e) => store.startColumnResize(e, 3)"></span>
          </th>
          <th v-if="colVisibility.commit" class="tableColHeader" data-col="4">
            <span class="resizeCol left" data-col="3" @mousedown="(e) => store.startColumnResize(e, 3)"></span>
            {{ store.t('colCommit') }}
          </th>
        </tr>
      </thead>
      <tbody>

      <!-- commit 行 -->
      <template
        v-for="row in store.commitRows"
        :key="row.index"
      >
      <tr
        :class="['commit', { current: row.isCurrent, mute: row.isMuted, commitDetailsOpen: store.expandedCommit?.commitHash === row.hash }]"
        :data-id="row.index"
        :data-color="row.colour"
        :id="row.isUncommitted ? 'uncommittedChanges' : undefined"
        @click="(e) => store.onCommitRowClick(e, row.index, row.hash)"
        @contextmenu="(e) => store.onCommitRowContextMenu(e, row.index, row.hash)"
        @dblclick="(e) => store.onCommitRowDblClick(e, row.index, row.hash)"
      >
        <!-- Graph 列（空，由 CommitGraph SVG 覆盖） -->
        <td>
          <span class="resizeCol right" data-col="0" @mousedown="(e) => store.startColumnResize(e, 0)"></span>
        </td>

        <!-- Description 列 -->
        <td v-if="branchLabelsAlignedToGraph">
          <span class="resizeCol right" data-col="1"></span>
          <span class="description">
            <span v-if="row.isHead" class="commitHeadDot"></span>
            <span class="text" v-html="row.subject"></span>
            <span v-if="row.body" class="commitbody" v-html="row.body"></span>
          </span>
        </td>
        <td v-else>
          <span class="resizeCol right" data-col="1"></span>
          <span class="description">
            <span v-if="row.isHead" class="commitHeadDot"></span>
            <!-- Ref 标签：branches -->
            <span
              v-for="ref in row.refBranches"
              :key="ref.type + ref.name"
              :class="['gitRef', ref.type, { active: ref.isActive }]"
              :data-name="ref.name"
              @click="(e) => store.onGitRefClick(e, ref.name)"
              @dblclick="(e) => store.onGitRefDblClick(e, row.index, row.hash, e.currentTarget as HTMLElement)"
              @contextmenu="(e) => store.onGitRefContextMenu(e, row.index, row.hash, e.currentTarget as HTMLElement)"
            >
              <IconSvg :name="ref.type === 'stash' ? 'stash' : 'branch'" />
              <span class="gitRefName" :data-fullref="ref.name">{{ ref.type === 'stash' ? ref.name.substring(5) : ref.name }}</span>
              <template v-if="ref.remotes">
                <span
                  v-for="remote in ref.remotes"
                  :key="remote"
                  class="gitRefHeadRemote"
                  :data-remote="remote"
                  :data-fullref="remote + '/' + ref.name"
                >{{ remote }}</span>
              </template>
            </span>
            <!-- Tags (left mode) -->
            <template v-if="!tagLabelsOnRight">
              <span
                v-for="tag in row.refTags"
                :key="tag.name"
                class="gitRef tag"
                :data-name="tag.name"
                :data-tagtype="tag.annotated ? 'annotated' : 'lightweight'"
                @click="(e) => store.onGitRefClick(e, tag.name)"
                @dblclick="(e) => store.onGitRefDblClick(e, row.index, row.hash, e.currentTarget as HTMLElement)"
                @contextmenu="(e) => store.onGitRefContextMenu(e, row.index, row.hash, e.currentTarget as HTMLElement)"
              >
                <IconSvg name="tag" />
                <span class="gitRefName" :data-fullref="tag.name">{{ tag.name }}</span>
              </span>
            </template>
            <span class="text" v-html="row.subject"></span>
            <span v-if="row.body" class="commitbody" v-html="row.body"></span>
            <!-- Tags (right mode) -->
            <span v-if="tagLabelsOnRight && row.refTags.length > 0" class="tagsWrapper">
              <span
                v-for="tag in row.refTags"
                :key="tag.name"
                class="gitRef tag"
                :data-name="tag.name"
                :data-tagtype="tag.annotated ? 'annotated' : 'lightweight'"
                @click="(e) => store.onGitRefClick(e, tag.name)"
                @dblclick="(e) => store.onGitRefDblClick(e, row.index, row.hash, e.currentTarget as HTMLElement)"
                @contextmenu="(e) => store.onGitRefContextMenu(e, row.index, row.hash, e.currentTarget as HTMLElement)"
              >
                <IconSvg name="tag" />
                <span class="gitRefName" :data-fullref="tag.name">{{ tag.name }}</span>
              </span>
            </span>
          </span>
        </td>

        <!-- Date 列 -->
        <td v-if="colVisibility.date" class="dateCol text" :title="row.dateTitle">
          {{ row.date }}
        </td>

        <!-- Author 列 -->
        <td v-if="colVisibility.author" class="authorCol text" :title="row.author + ' <' + row.email + '>'">
          <span v-if="store.config.fetchAvatars" class="avatar" :data-email="row.email">
            <img v-if="row.avatar" class="avatarImg" :src="row.avatar" />
          </span>
          {{ row.author }}
        </td>

        <!-- Commit hash 列 -->
        <td v-if="colVisibility.commit" class="text" :title="row.hash">
          {{ row.shortHash }}
        </td>
      </tr>

      <!-- Commit Details View (inline 模式，紧跟在展开的 commit 行后) -->
      <tr
        v-if="!store.isCdvDocked && store.expandedCommit?.commitHash === row.hash"
        id="cdv"
        class="inline"
        :style="{ height: store.cdvHeightPx }"
      >
        <td><div class="cdvHeightResize" @mousedown="store.startCdvHeightResize($event)"></div></td>
        <td :colspan="store.getNumColumns() - 1">
          <CommitDetails />
        </td>
      </tr>
      </template>
      </tbody>
    </table>

    <!-- Footer：加载更多 -->
    <div id="footer">
      <div
        v-if="store.moreCommitsAvailable"
        id="loadMoreCommitsBtn"
        class="roundedBtn"
        @click="loadMoreCommits"
      >
        {{ store.t('loadMoreCommits') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 表格布局由全局 main.css 控制 */
</style>
