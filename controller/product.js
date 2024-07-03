const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Product = require("../model/product");
const Order = require("../model/order");
const Shop = require("../model/shop");
const { upload } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const mongoose = require("mongoose");

// create product
router.post(
  "/create-product",
  upload.array("images"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shopId = req.body.shopId;
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return next(new ErrorHandler("Id cửa hàng không hợp lệ!", 400));
      } else {
        const files = req.files;

        const imageUrls = files.map((file) => file.path); // Lấy đường dẫn URL của các hình ảnh đã tải lên
        console.log(imageUrls);
        const productData = req.body;
        productData.images = imageUrls;
        productData.shop = shop;

        const product = await Product.create(productData);

        res.status(201).json({
          success: true,
          product,
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all products of a shop
router.get(
  "/get-all-products-shop/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find({ shopId: req.params.id });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// delete product of a shop
router.delete(
  "/delete-shop-product/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = req.params.id;

      const productData = await Product.findById(productId);

      productData.images.forEach((imageUrl) => {
        const filename = imageUrl;
        const filePath = `uploads/${filename}`;

        fs.unlink(filePath, (err) => {
          if (err) {
            console.log(err);
          }
        });
      });

      const product = await Product.findByIdAndDelete(productId);

      if (!product) {
        return next(
          new ErrorHandler("Không tìm thấy sản phẩm với ID này!", 500)
        );
      }

      res.status(201).json({
        success: true,
        message: "Xóa sản phẩm thành công!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all products
router.get(
  "/get-all-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({ createdAt: -1 });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// review for a product
router.put(
  "/create-new-review",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { user, rating, comment, productId, orderId } = req.body;

      const product = await Product.findById(productId);

      const review = {
        user,
        rating,
        comment,
        productId,
      };

      const isReviewed = product.reviews.find(
        (rev) => rev.user._id === req.user._id
      );

      if (isReviewed) {
        product.reviews.forEach((rev) => {
          if (rev.user._id === req.user._id) {
            (rev.rating = rating), (rev.comment = comment), (rev.user = user);
          }
        });
      } else {
        product.reviews.push(review);
      }

      let avg = 0;

      product.reviews.forEach((rev) => {
        avg += rev.rating;
      });

      product.ratings = avg / product.reviews.length;

      await product.save({ validateBeforeSave: false });

      await Order.findByIdAndUpdate(
        orderId,
        { $set: { "cart.$[elem].isReviewed": true } },
        { arrayFilters: [{ "elem._id": productId }], new: true }
      );

      res.status(200).json({
        success: true,
        message: "Đánh giá thành công!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// all products --- for admin
router.get(
  "/admin-all-products",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.get(
  "/get-product/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = req.params.id;

      const product = await Product.findById(productId);

      if (!product) {
        return next(
          new ErrorHandler("Không tìm thấy sản phẩm với ID này!", 404)
        );
      }

      res.status(200).json({
        success: true,
        product,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
// Update product by ID
router.put(
  "/update-product/:id",
  isSeller, // Chắc chắn rằng chỉ người bán có quyền cập nhật sản phẩm
  upload.array("images"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = req.params.id;
      const productData = req.body;

      // Kiểm tra xem sản phẩm có tồn tại không
      const product = await Product.findById(productId);
      if (!product) {
        return next(
          new ErrorHandler("Không tìm thấy sản phẩm với ID này!", 404)
        );
      }

      // Kiểm tra xem người dùng có quyền chỉnh sửa sản phẩm này không
      // if (product.shop.toString() !== req.user.shop) {
      // return next(
      // new ErrorHandler("Bạn không có quyền chỉnh sửa sản phẩm này!", 403)
      // );
      // }

      // Xử lý hình ảnh nếu có
      if (req.files) {
        const files = req.files;
        const imageUrls = files.map((file) => file.path);
        // productData.images = imageUrls;
        productData.images = [...product.images, ...imageUrls];
      }

      // Cập nhật thông tin sản phẩm
      await Product.findByIdAndUpdate(productId, productData, { new: true });

      res.status(200).json({
        success: true,
        message: "Sản phẩm đã được cập nhật thành công!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
// Thêm route để tải lên hình ảnh mới
router.post(
  "/upload-images",
  isSeller, // Đảm bảo người bán mới có quyền tải lên hình ảnh
  upload.array("images"), // Đặt tên field là "images"
  catchAsyncErrors(async (req, res, next) => {
    try {
      const files = req.files;

      const imageUrls = files.map((file) => file.path); // Lấy đường dẫn URL của các hình ảnh đã tải lên

      res.status(200).json({
        success: true,
        imageUrls,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// Lấy danh sách sản phẩm có tags
router.get(
  "/products/tag/:tag",
  catchAsyncErrors(async (req, res, next) => {
    const tag = req.params.tag;

    // Tìm các sản phẩm có tags tương ứng trong cơ sở dữ liệu
    const products = await Product.find({ tags: tag });

    res.status(200).json({
      success: true,
      products,
    });
  })
);

module.exports = router;
