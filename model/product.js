const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Nhập tên sản phẩm vào!"],
  },
  description: {
    type: String,
    required: [true, "Nhập mô tả sản phẩm!"],
  },
  category: {
    type: String,
    required: [true, "Chọn danh mục sản phẩm!"],
  },
  // tags: {
  //   type: String,
  // },
  originalPrice: {
    type: Number,
    required: [true, "Nhập giá sản phẩm vào!"],
  },

  discountPrice: {
    type: Number,
    default: 0,
  },

  stock: {
    type: Number,
    required: [true, "Nhập số lượng sản phẩm!"],
  },
  images: [
    {
      type: String,
    },
  ],
  reviews: [
    {
      user: {
        type: Object,
      },
      rating: {
        type: Number,
      },
      comment: {
        type: String,
      },
      productId: {
        type: String,
      },
      createdAt: {
        type: Date,
        default: Date.now(),
      },
    },
  ],
  ratings: {
    type: Number,
  },
  shopId: {
    type: String,
    required: true,
  },
  shop: {
    type: Object,
    required: true,
  },
  sold_out: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Product", productSchema);
