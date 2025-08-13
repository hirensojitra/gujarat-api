const { gql } = require("apollo-server-express");

const typeDefs = gql`
  scalar JSON
  scalar Upload

  type Pagination {
    currentPage: Int!
    totalPages: Int!
    totalPosts: Int!
  }

  type PostListResponse {
    posts: [PostDetails!]!
    pagination: Pagination!
  }

  enum StrokeAlignment {
    inside
    outside
    center
  }

  type RectProperties {
    x: Float!
    y: Float!
    width: Float!
    height: Float!
    rx: Float
    ry: Float
    fill: String
    fillOpacity: Float
    opacity: Float
    rotate: Float
    originX: Float
    originY: Float
    stroke: String
    strokeOpacity: Float
    strokeWidth: Float
    strokeAlignment: StrokeAlignment
  }
  type CircleProperties {
    cx: Float!
    cy: Float!
    r: Float!
    fill: String!
    fillOpacity: Float
    opacity: Float!
    originX: Float!
    originY: Float!
    strokeWidth: Float
    strokeOpacity: Float
    strokeAlignment: StrokeAlignment
  }
  type EllipseProperties {
    cx: Float!
    cy: Float!
    rx: Float!
    ry: Float!
    fill: String!
    fillOpacity: Float
    opacity: Float!
    originX: Float!
    originY: Float!
    rotate: Float!
    strokeWidth: Float
    strokeOpacity: Float
    strokeAlignment: StrokeAlignment
  }
  type LineProperties {
    x1: Float!
    y1: Float!
    x2: Float!
    y2: Float!
    stroke: String!
    strokeWidth: Float!
    opacity: Float!
    originX: Float!
    originY: Float!
    rotate: Float!
  }

  enum TextElementType {
    text
    select
    textarea
    date
  }

  type TextShadow {
    enable: Boolean!
    color: String!
    blur: Float!
    offsetX: Float!
    offsetY: Float!
  }
  type Gradient {
    enable: Boolean!
    startColor: String!
    endColor: String!
    direction: String!
  }
  type Outline {
    enable: Boolean!
    color: String!
    width: Float!
  }
  type Glow {
    enable: Boolean!
    color: String!
    blur: Float!
  }
  type TextEffects {
    enable: Boolean!
    gradient: Gradient!
    outline: Outline!
    glow: Glow!
  }
  type FontStyle {
    italic: Boolean!
    underline: Boolean!
  }

  type TextElement {
    x: Float!
    y: Float!
    fs: Float!
    fw: String!
    text: String
    api: String
    lang: String
    controlName: String
    dependency: String
    type: TextElementType!
    color: String!
    fontStyle: FontStyle!
    rotate: Float!
    fontFamily: String!
    textShadow: TextShadow!
    backgroundColor: String!
    textEffects: TextEffects!
    textAnchor: String!
    alignmentBaseline: String!
    letterSpacing: Float!
    lineHeight: Float!
    textTransformation: String!
    opacity: Float!
    originX: Float!
    originY: Float!
  }

  type SvgProperties {
    fill: String!
    stroke: String!
    strokeWidth: Float!
  }
  type ImageElement {
    r: Float!
    x: Float!
    y: Float!
    imageUrl: String!
    borderColor: String!
    borderWidth: Float!
    shape: String!
    origin: String!
    placeholder: String!
    svgProperties: SvgProperties!
    rotate: Float!
  }

  type DataElement {
    title: String!
    editable: Boolean!
    boxed: Boolean!
    rect: RectProperties
    circle: CircleProperties
    ellipse: EllipseProperties
    line: LineProperties
    text: TextElement
    image: ImageElement
  }

  type PostDetails {
    id: String!
    deleted: Boolean!
    info: String!
    info_show: Boolean!
    h: Float!
    w: Float!
    title: String!
    backgroundurl: String!
    download_counter: Int!
    data: JSON!
    msg: String
    apiData: JSON
    image: String
    published: Boolean!
    track: Boolean!
    created_at: String
    updated_at: String
    deleted_at: String
    subcategory_id: ID
    category: PostCategory
    subcategory: PostSubcategory
  }

  input RectPropertiesInput {
    x: Float!
    y: Float!
    width: Float!
    height: Float!
    rx: Float
    ry: Float
    fill: String
    fillOpacity: Float
    opacity: Float
    rotate: Float
    originX: Float
    originY: Float
    stroke: String
    strokeOpacity: Float
    strokeWidth: Float
    strokeAlignment: StrokeAlignment
  }
  input CirclePropertiesInput {
    cx: Float!
    cy: Float!
    r: Float!
    fill: String!
    fillOpacity: Float
    opacity: Float!
    originX: Float!
    originY: Float!
    strokeWidth: Float
    strokeOpacity: Float
    strokeAlignment: StrokeAlignment
  }
  input EllipsePropertiesInput {
    cx: Float!
    cy: Float!
    rx: Float!
    ry: Float!
    fill: String!
    fillOpacity: Float
    opacity: Float!
    originX: Float!
    originY: Float!
    rotate: Float!
    strokeWidth: Float
    strokeOpacity: Float
    strokeAlignment: StrokeAlignment
  }
  input LinePropertiesInput {
    x1: Float!
    y1: Float!
    x2: Float!
    y2: Float!
    stroke: String!
    strokeWidth: Float!
    opacity: Float!
    originX: Float!
    originY: Float!
    rotate: Float!
  }
  input TextShadowInput {
    enable: Boolean!
    color: String!
    blur: Float!
    offsetX: Float!
    offsetY: Float!
  }
  input GradientInput {
    enable: Boolean!
    startColor: String!
    endColor: String!
    direction: String!
  }
  input OutlineInput {
    enable: Boolean!
    color: String!
    width: Float!
  }
  input GlowInput {
    enable: Boolean!
    color: String!
    blur: Float!
  }
  input TextEffectsInput {
    enable: Boolean!
    gradient: GradientInput!
    outline: OutlineInput!
    glow: GlowInput!
  }
  input FontStyleInput {
    italic: Boolean!
    underline: Boolean!
  }
  input TextElementInput {
    x: Float!
    y: Float!
    fs: Float!
    fw: String!
    text: String
    api: String
    lang: String
    controlName: String
    dependency: String
    type: TextElementType!
    color: String!
    fontStyle: FontStyleInput!
    rotate: Float!
    fontFamily: String!
    textShadow: TextShadowInput!
    backgroundColor: String!
    textEffects: TextEffectsInput!
    textAnchor: String!
    alignmentBaseline: String!
    letterSpacing: Float!
    lineHeight: Float!
    textTransformation: String!
    opacity: Float!
    originX: Float!
    originY: Float!
  }
  input SvgPropertiesInput {
    fill: String!
    stroke: String!
    strokeWidth: Float!
  }
  input ImageElementInput {
    r: Float!
    x: Float!
    y: Float!
    imageUrl: String!
    borderColor: String!
    borderWidth: Float!
    shape: String!
    origin: String!
    placeholder: String!
    svgProperties: SvgPropertiesInput!
    rotate: Float!
  }
  input DataElementInput {
    title: String!
    editable: Boolean!
    boxed: Boolean!
    rect: RectPropertiesInput
    circle: CirclePropertiesInput
    ellipse: EllipsePropertiesInput
    line: LinePropertiesInput
    text: TextElementInput
    image: ImageElementInput
  }

  input PostInput {
    h: Float!
    w: Float!
    title: String!
    info: String!
    info_show: Boolean!
    backgroundurl: String!
    data: JSON!
    download_counter: Int!
    published: Boolean!
    track: Boolean!
    subcategory_id: ID!
  }
  input PostUpdateInput {
    id: String!
    deleted: Boolean
    h: Float
    w: Float
    title: String
    info: String
    info_show: Boolean
    backgroundurl: String
    data: JSON
    download_counter: Int
    published: Boolean
    track: Boolean
    category_id: ID
    subcategory_id: ID
    apiData: JSON
  }

  type Query {
    getAllPosts(
      page: Int!
      limit: Int
      search: String
      sortBy: String
      order: String
      published: Boolean
      info_show: Boolean
      subcategory_id: ID
    ): PostListResponse!
    getPostById(id: String!): PostDetails

    getAllSoftDeletedPosts(
      page: Int!
      limit: Int
      search: String
      sortBy: String
      order: String
    ): PostListResponse!

    getTotalPostLength: Int!
    getTotalDeletedPostLength: Int!
    getDownloadCounter(id: String!): Int!
    updateDownloadCounter(id: String!): Int!
  }

  type Mutation {
    addPost(input: PostInput!): PostDetails!
    updatePost(input: PostUpdateInput!): PostDetails!
    softDeletePost(id: String!): Boolean!
    recoverPost(id: String!): Boolean!
    hardDeletePost(id: String!): Boolean!
    uploadThumbnail(postId: String!, file: Upload!): String!
  }
`;

module.exports = { typeDefs };
