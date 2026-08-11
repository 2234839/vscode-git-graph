<script setup lang="ts">
/**
 * CommitTable — 提交列表表格
 *
 * 用 Vue 的 v-for 替代原 innerHTML 字符串拼接。
 * 性能优化：用 computed 缓存格式化后的数据，避免每次重渲染重复计算。
 */
import { computed } from 'vue';
import { useGitGraphStore } from '@/stores/gitGraph';

const store = useGitGraphStore();

/** 提交列表（计算属性，自动追踪依赖） */
const commitRows = computed(() => {
  return store.commits.map((commit, index) => {
    const subject = commit.message.split(/\r?\n/)[0];
    const date = new Date(commit.date * 1000);
    return {
      index,
      hash: commit.hash,
      hashShort: commit.hash.substring(0, 8),
      subject,
      author: commit.author,
      email: commit.email,
      date,
      isHead: commit.hash === store.commitHead,
      heads: commit.heads || [],
      tags: commit.tags || [],
      stash: commit.stash,
    };
  });
});

/** 格式化日期 */
function formatDate(date: Date): string {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}
</script>

<template>
  <div id="commitTable" class="commit-table">
    <table>
      <thead>
        <tr id="tableColHeaders">
          <th class="tableColHeader" data-col="0">Graph</th>
          <th class="tableColHeader" data-col="1">Description</th>
          <th class="tableColHeader dateCol" data-col="2">Date</th>
          <th class="tableColHeader authorCol" data-col="3">Author</th>
          <th class="tableColHeader" data-col="4">Commit</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in commitRows"
          :key="row.index"
          :class="['commit', { current: row.isHead }]"
          :data-id="row.index"
        >
          <td></td>
          <td>
            <span class="description">
              <span class="commitHeadDot" v-if="row.isHead"></span>
              <span
                v-for="head in row.heads"
                :key="head"
                class="gitRef head"
                :data-name="head"
              >
                <span class="gitRefName" :data-fullref="head">{{ head }}</span>
              </span>
              <span class="text">{{ row.subject }}</span>
            </span>
          </td>
          <td class="dateCol text" :title="formatDate(row.date)">
            {{ formatDate(row.date) }}
          </td>
          <td class="authorCol text" :title="row.author + ' <' + row.email + '>'">
            <img
              v-if="store.avatars[row.email]"
              class="avatarImg"
              :src="store.avatars[row.email]"
            />
            {{ row.author }}
          </td>
          <td class="text" :title="row.hash">{{ row.hashShort }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.commit-table {
  flex: 1;
  overflow-y: auto;
}

.commit-table table {
  width: 100%;
  border-collapse: collapse;
}

.commit.current {
  background-color: var(--vscode-list-activeSelectionBackground);
}
</style>
