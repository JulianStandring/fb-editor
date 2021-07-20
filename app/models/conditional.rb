class Conditional
  include ActiveModel::Model
  attr_accessor :page, :expressions
  attr_writer :expressions_attributes
end
