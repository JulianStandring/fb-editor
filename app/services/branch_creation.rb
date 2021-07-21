class BranchCreation
  include ActiveModel::Model
  attr_accessor :previous_flow_uuid, :service_id, :latest_metadata, :version,
                :conditionals

  def create
    return false if invalid?

    version = MetadataApiClient::Version.create(
      service_id: service_id,
      payload: metadata
    )

    if version.errors?
      errors.add(:base, :invalid, message: version.errors)
      false
    else
      @version = version
    end
  end

  def branch_uuid
    new_branch.uuid
  end

  def metadata
    latest_metadata['flow'].merge!(new_branch.to_metadata)
    latest_metadata['flow'][branch_uuid]['next'].merge!(conditionals) # probably do not to it this way :)
    latest_metadata['flow'][previous_flow_uuid]['next']['default'] = branch_uuid
    latest_metadata
  end

  def conditionals
    # all the things
  end

  def new_branch
    @new_branch ||= NewFlowBranchGenerator.new
  end
end
