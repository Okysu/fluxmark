# 插件系统

FluxMark 插件是普通 TypeScript 对象，可以把多个扩展组合到一个编译器实例中。插件不是隔离运行的脚本；它与宿主应用共享进程、权限和数据。

## 四个阶段，四类扩展点

| 阶段 | 扩展点 | 职责 |
| --- | --- | --- |
| 块级解析 | `blockRules` | 识别物理行并产生 `FluxBlockNode` |
| 行内解析 | `pipeModifiers` | 处理管道表达式中的修饰符 |
| AST 转换 | `astTransforms` | 修改或替换完整 `FluxDocument` |
| 渲染 | `htmlRenderers` | 覆盖 HTML 节点或行内 token 输出 |

`calloutVariants` 是附加注册项，用于让解析器识别新的提示块变体。

## 一个完整插件

下面的插件增加 `! math ...` 块、`badge` 修饰符元数据、章节 id 和对应 HTML 输出：

```ts
import { FluxMark, createFluxNodeBase, walkAST } from 'fluxmark'
import type { FluxBlockRule, FluxPluginDefinition } from 'fluxmark'

const mathRule: FluxBlockRule = {
  name: 'math',
  priority: 120,
  parse({ line }) {
    if (!line.content.startsWith('! math ')) return null

    return {
      node: {
        ...createFluxNodeBase(line),
        type: 'CustomBlock',
        name: 'math',
        content: line.content.slice(7),
        attributes: {},
        children: [],
      },
    }
  },
}

const mathPlugin: FluxPluginDefinition = {
  name: 'math',
  calloutVariants: ['proof'],
  blockRules: [mathRule],
  pipeModifiers: {
    badge(modifier, { attributes }) {
      attributes.kind = modifier
      return true
    },
  },
  astTransforms: [
    (document) => {
      walkAST(document, {
        Section: {
          enter(node) {
            node.id = node.title
              .map((token) => token.content)
              .join('-')
              .toLowerCase()
          },
        },
      })
    },
  ],
  htmlRenderers: {
    CustomBlock(node, _childrenHtml, helper) {
      if (node.name !== 'math') return helper.defaultRender()
      return `<output data-kind="math">${helper.escapeHtml(node.content)}</output>`
    },
    InlineToken(token, defaultRender) {
      return token.attributes.kind === 'badge'
        ? `<data value="badge">${defaultRender()}</data>`
        : defaultRender()
    },
  },
}

const flux = new FluxMark({ plugins: [mathPlugin] })
const source = `# Result
  [Stable|badge]
  > [proof] Induction
  ! math x^2
`

console.log(flux.renderToHTML(source))
```

默认 HTML 渲染器已经会为 `badge` 自定义修饰符添加样式。这里的管道处理器额外写入 `attributes.kind`，行内覆盖再用 `<data>` 包裹默认输出。这个分工避免了在覆盖中重复实现样式渲染。

## 注册方式

构造函数的 `plugins` 接收插件定义数组：

```ts
const flux = new FluxMark({ plugins: [mathPlugin] })
```

也可以用 `use` 追加定义，或传入带选项的插件工厂：

```ts
interface CalloutOptions {
  variant: string
}

const calloutPlugin = (options: CalloutOptions): FluxPluginDefinition => ({
  name: `callout-${options.variant}`,
  calloutVariants: [options.variant],
})

const flux = new FluxMark()
  .use(mathPlugin)
  .use(calloutPlugin, { variant: 'success' })
```

`use` 返回当前实例。`plugins` getter 暴露只读的已注册定义数组。

## 块级规则

`FluxBlockRule` 的结构如下：

```ts
import type { FluxBlockRule } from 'fluxmark'

const rule: FluxBlockRule = {
  name: 'example',
  priority: 100,
  parse(context) {
    console.log(
      context.index,
      context.line.number,
      context.parentIndent,
      context.sectionDepth,
    )
    return null
  },
}
```

解析上下文提供：

| 字段 | 含义 |
| --- | --- |
| `source` | 完整源文本 |
| `lines` | 所有物理行，只读数组 |
| `index` | 当前行索引 |
| `line` | 当前 `FluxSourceLine` |
| `parentIndent` | 父块缩进边界 |
| `sectionDepth` | 当前章节嵌套深度 |
| `parseInline(text)` | 使用当前修饰符配置解析行内文本 |

自定义规则会在内置块规则之前尝试。`priority` 越大越先执行，自定义规则默认值为 100。未匹配时必须返回 `null`，匹配时返回 `{ node, consumed? }`。

`consumed` 表示包括当前行在内消耗的物理行数，默认是 1，必须是正整数。非法值会产生警告并推进一行；解析器也会防止错误规则让源码游标停滞。规则仍应尽快拒绝不匹配的行，避免在每个块上执行昂贵扫描。

插件块节点可以使用 `createFluxNodeBase(line)` 生成标准的 `line`、`column`、`indent` 和初始 `range`。多行规则应把 `range.end` 扩展到最后一行，并准确返回 `consumed`。

## 管道修饰符

`pipeModifiers` 是以修饰符名称为键的处理器映射。查找先使用原始名称，再使用小写名称，因此注册小写键即可支持大小写变体。

```ts
const plugin: FluxPluginDefinition = {
  pipeModifiers: {
    badge(modifier, context) {
      context.attributes.kind = modifier
      context.attributes.content = context.content
      return true
    },
  },
}
```

处理器可以读取当前 `content`、`modifier`、`style`，并修改 `attributes`。返回值决定后续行为：

| 返回值 | 行为 |
| --- | --- |
| `false` | 不消费，继续执行内置修饰符处理 |
| `true` | 消费该修饰符 |
| `undefined` | 消费该修饰符 |
| `Partial<FluxInlineStyle>` | 合并样式字段并消费 |

未识别的修饰符在调用插件前已加入 `style.customModifiers`，通常不需要在处理器中重复添加。若插件返回 `false`，内置别名、颜色、URL 和提示语法仍有机会处理它。

## AST 转换

`astTransforms` 在解析完成后按注册顺序执行。每个转换接收文档和 `{ source }`，可以原地修改并返回 `undefined`，也可以返回新的 `FluxDocument`：

```ts
import type { FluxASTTransform, FluxPluginDefinition } from 'fluxmark'

const removeRules: FluxASTTransform = (document, context) => {
  console.log(context.source.length, document.issues.length)
  document.children = document.children.filter((node) => node.type !== 'HorizontalRule')
}

const plugin: FluxPluginDefinition = {
  astTransforms: [removeRules],
}
```

转换应保留 `Document` 根及列表子节点约束。需要复杂遍历时使用 [`walkAST`](/zh/guide/walker)，不要在多个转换中无意中重复做全树扫描。

## 渲染覆盖

HTML 节点覆盖接收 `(node, childrenHtml, helper)`；行内覆盖接收 `(token, defaultRender, helper)`。具体签名和完整示例见[渲染器](/zh/guide/renderers)。

同一插件可以只实现一个阶段，不必同时实现所有扩展点。例如，仅提供 `astTransforms` 的章节 id 插件也是完整插件。

### 合并顺序

- 块规则按优先级排序。
- 同名管道修饰符由后注册的定义覆盖先注册的定义。
- AST 转换按注册顺序全部执行。
- 后注册插件的同类型 HTML 渲染覆盖优先。
- `createHtmlRenderer` 或实例渲染选项中的覆盖优先于插件覆盖。
- `calloutVariants` 会合并到解析器，并注册为小写变体。

## 安全与性能

插件可以执行任意宿主代码，必须来自可信来源。HTML 覆盖若拼接不可信值，应使用 `helper.escapeHtml`、`helper.escapeAttribute` 和 `helper.safeUrl`；直接返回未经处理的源文本会绕过默认安全边界。

解析扩展应保持失败路径廉价，避免灾难性回溯正则和对同一后缀的重复扫描。AST 与渲染扩展应说明自身时间复杂度，并避免在逐节点回调中重复遍历整棵树。
