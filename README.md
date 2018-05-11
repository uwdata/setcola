# SetCoLa
SetCoLa is a domain-specific language for specifying high-level graph layout constraints relative to properties of the underlying graph. This repository contains a SetCoLa compiler that generates constraints for [WebCoLa](http://ialab.it.monash.edu/webcola/) and includes an [online graph editor](https://uwdata.github.io/setcola/).

## Citation
If you are interested in this work, please see [our EuroVis 2018 research paper](http://idl.cs.washington.edu/papers/setcola/) and consider citing our work:

```
@inproceedings{2016-setcola,
    title = {SetCoLa: High-Level Constraints for Graph Layout},
    author = {Jane Hoffswell AND Alan Borning AND Jeffrey Heer},
    booktitle = {Computer Graphics Forum (Proc. EuroVis)},
    year = {2018},
    url = {http://idl.cs.washington.edu/files/2018-SetCoLa-EuroVis.pdf},
}
```

## Language
A SetCoLa specification is defined by multiple constraint definitions that specify the desired behavior for the graph layout and may include a set of "guides" (reference elements that serve as positional anchors), which is a list of nodes that include an "x" and/or "y" property. Each **constraint definition** includes a **set definition** and **constraint application**, which may apply one or more constraints to the element of each set.

### Set Definition
There are four ways to define sets in SetCoLa: *partitioning nodes into sets*, *specifying sets with predicates*, *collecting nodes using keys*, and *composing previously defined sets*.

#### Partitioning Nodes into Sets
This strategy partitions all the nodes into disjoint sets based on the value of the `partitionProperty` of the node. You may also specify a list of values to `include` or `exclude`, which checks for those values explicitly when completing the partition.

```json
{"partition": "partitionProperty", "include": [...], "exclude": [...]}
```

#### Specifying Sets with Predicates
This strategy defines explict sets based on a predicate on the graph nodes. You may refer to properties of the `node` using dot syntax. The (optional) name for the set allows you to refer to this set later in the specificaiton.

```json
[{"expr": "node.color === 'red' || node.color === 'blue'", "name": "setName"}, ...]
```

#### Collecting Nodes Using Keys
This strategy generates sets by identify node keys. Sets generated in this way may not be disjoint.

```json
{"collect": ["node", "node.neighbors"]}
```

In the above example, we extract the `_id` from all the identified nodes and create a set that contains all the identified nodes. In other words, for each node in the graph, we create a set that contains the node and all of its neighbors.

#### Composing Previously Defined Sets
This strategy allows for the hierarchical composition of sets by composing previously defined sets into a new set.

```json
["setName"]
```

In the above example, we create a new set that contains one element: the set named `"setName"`.

### Constraints
There are currently 7 constraint types supported in SetCoLa: `alignment`, `position`, `order`, `circle`, `cluster`, `hull`, and `padding`.

#### `alignment`

```json
{"constraint": "align", "axis": "x", "orientation": "center"}
```

The `axis` along which to align the nodes can be defined as `x` or `y`. 

The orientation can be defined as `center`, `left`, `right`, `top`, or `bottom`.

#### `position`

```json
{"constraint": "position", "position": "left", "of": "right_border", "gap": 20}
```

This constraint positions all the nodes in each set to the left of the guide `right_border`.

The `position` can be defined as `left`, `right`, `above`, or `below`. 

The (optional) `gap` property defines the minimum amount of space between the node and guide.

#### `order`

```json
{"constraint": "order", "axis": "x", "by": "nodeProperty", "order": [2, 3, 1, 0], "reverse": true, "band": 200}
```

The `axis` along which to order the nodes can be defined as `x` or `y`.

The property `by` determines which `nodeProperty` to use for the order.

The (optional) `order` property explicitly sets the order that should be used and `reverse` reverses the sort order.

The (optional) `band` defines the amont of space that each section of the order should take up.

#### `circle`

```json
{"constraint": "circle", "around": "center", "radius": 10}
```

Adds additional edges to approximate a circle layout. `around` can be either `center` or the name of a guide. The `radius` determines the size of the circle.

#### `cluster`

```json
{"constraint": "cluster"}
```

Encourages the nodes to cluster together by introducing additional edges.

#### `hull`

```json
{"constraint": "hull"}
```

Adds an enclosing boundary around the nodes.

#### `padding`

```json
{"constraint": "padding", "amount": 5}
```

Adds `amount` padding around the nodes. *Note: At this time, this constraint can only apply to any given node once.*

## Usage
The basic usage of the SetCoLa compiler is shown below. This behavior is demonstrated in the file `editor.js`.

```javascript
var result = setcola
  .nodes(graph.nodes)        // Set the graph nodes
  .links(graph.links)        // Set the graph links
  .groups(groups)            // (Optional) Set any predefined groups in the graph
  .guides(guides)            // (Optional) Define any guides that are used by the SetCoLa layout
  .constraints(setcolaSpec)  // Set the constraints
  .gap(gap)                  // The default gap size to use for generating the constraints (if not specified in the SetCoLa spec)
  .layout();                 // Run the layout to convert the SetCoLa constraints to WebCoLa constraints
```
The call `setcola.layout()` returns a layout in the following form:

```javascript
result = {
  "nodes": [...],         // The output nodes (note: this may contain more nodes than originally input)
  "links": [...],         // The output links (note: this may contain more links than originally input)
  "guides": [...],        // The SetCoLa guides
  "groups": [...],        // The output WebCoLa groups
  "constraints": [...],   // The output WebCoLa constraints
  "constraintDefs": [...] // The original SetCoLa constraints
}
```
This output can then be used to produce the actual graph layout using WebCoLa. For more information on WebCoLa, please check out the [website](http://ialab.it.monash.edu/webcola/). The basic usage of WebCoLa is shown below and demonstrated in the file `renderer.js`.

```javascript
d3cola
    .nodes(result.nodes)
    .links(result.links)
    .constraints(result.constraints)
    .avoidOverlaps(true)
    .start(10,15,20);
```

## Example
This is a small SetCoLa example that shows how to create a simple tree layout.

```javascript
// The SetCoLa constraints
var setcolaSpec = [
  {
    "name": "layer",
    "sets": {"partition": "depth"},
    "forEach": [{"constraint": "align", "axis": "x"}]
  },
  {
    "name": "sort",
    "sets": ["layer"],
    "forEach": [{"constraint": "order", "axis": "y", "by": "depth"}]
  }
];
```
When applied to this graph:

```javascript
var graph = {
  "nodes": [
    {"name": "a"}, {"name": "b"},
    {"name": "c"}, {"name": "d"},
    {"name": "e"}, {"name": "f"}
  ],
  "links": [
    {"source": 0, "target": 1},
    {"source": 0, "target": 2},
    {"source": 1, "target": 3},
    {"source": 2, "target": 4},
    {"source": 2, "target": 5}
  ]
};
```

SetCoLa produces the following layout:

![alt text](https://github.com/uwdata/setcola/blob/master/images/smalltree.png "SetCoLa small tree layout")

For more examples, please take a look at our [online graph editor](https://uwdata.github.io/setcola/).

## Development

To produce the SetCoLa compiler module on your local machine, use the following command `rollup -c`. This command will produce the file `dist/setcola.js`. You can then host the website locally on a mac using the command `python -m SimpleHTTPServer 8080`.
