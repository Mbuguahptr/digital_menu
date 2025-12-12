import React from "react";
import { Link } from "react-router-dom";
import getImageUrl from "../utils/getImageUrl";

export default function ProductCard({ product }) {
  const imageUrl = getImageUrl(product.image);

  return (
    <div className="flex flex-col justify-between bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transform transition-transform transition-shadow duration-300 relative overflow-hidden p-6">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-36 object-cover rounded-2xl mb-4"
        />
      )}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {product.name}
        </h3>
        <p className="text-gray-700 dark:text-gray-300 font-medium mt-2">
          {product.price} {product.currency}
        </p>
        {product.description && (
          <p className="mt-3 text-gray-500 dark:text-gray-400 leading-relaxed">
            {product.description}
          </p>
        )}
      </div>
      <div className="mt-5 flex gap-4">
        <Link
          to={`/compare?name=${encodeURIComponent(product.name)}`}
          className="text-blue-600 hover:underline font-medium"
        >
          Compare
        </Link>
        <Link
          to={`/book/${product.id}`}
          className="text-green-600 hover:underline font-medium"
        >
          Book
        </Link>
      </div>
      <div className="absolute inset-0 pointer-events-none rounded-2xl shadow-glow opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );
}
